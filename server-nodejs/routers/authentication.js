const { Issuer, generators } = require('openid-client')
const koaRouter = require('koa-router')
const jwt       = require('jsonwebtoken')

const authentication = async ({ config: { host, oidcProviders }, accessTokenSecret }) => {
  const router = koaRouter()

  const clients = Object.fromEntries(await Promise.all(
    Object.entries(oidcProviders).map(async ([shortName, { client_id, client_secret, issuer }]) => {
      const discoveredIssuer = await Issuer.discover(issuer)
      console.log('Discovered issuer %s %O', discoveredIssuer.issuer, discoveredIssuer.metadata)

      const client = new discoveredIssuer.Client({
        client_id,
        client_secret,
        redirect_uris:  [`${host}/auth/${shortName}/callback`],
        response_types: ['code'],
      })
      return [shortName, client]
    })
  ))

  const getAuth = ctx => {
    const { provider } = ctx.params
    const code_verifier = generators.codeVerifier()
    ctx.session.code_verifier = code_verifier
    const code_challenge = generators.codeChallenge(code_verifier)

    const client = clients[provider]
    const authorizationUrl = client.authorizationUrl({
      code_challenge,
      scope:                 'openid email profile',
      code_challenge_method: 'S256',
    })

    ctx.redirect(authorizationUrl)
  }

  const getAuthCallback = async ctx => {
    const { provider } = ctx.params
    const { code_verifier } = ctx.session

    const client = clients[provider]
    const parameters = client.callbackParams(ctx.request)

    console.log('back with params', parameters)
    const tokenSet = await client.callback(
      `${host}/auth/${provider}/callback`, parameters, { code_verifier },
    )

    const { sub, iss, name, picture } = tokenSet.claims()
    const user = { sub, iss, name, picture }
    const accessToken = jwt.sign(user, accessTokenSecret, { expiresIn: '1h' })

    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    ctx.set('Pragma', 'no-cache')
    ctx.set('Expires', 0)
    ctx.body = `
      <script>
        window.opener.postMessage({
          authenticated: true,
          user: ${JSON.stringify({ accessToken, ...user })},
        }, '*')
        window.close()
      </script>
    `
  }

  router.get('/auth/:provider', getAuth)
  router.get('/auth/:provider/callback', getAuthCallback)

  return router.routes()
}

module.exports = authentication
