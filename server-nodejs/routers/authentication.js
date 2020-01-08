const { Issuer, generators } = require('openid-client')

const host = 'http://ydalar.xn--hksgrd-juac2m.se:3000'

const authentication = async ({ router }) => {
  const googleIssuer = await Issuer.discover('https://accounts.google.com')
  console.log('Discovered issuer %s %O', googleIssuer.issuer, googleIssuer.metadata)

  const client = new googleIssuer.Client({
    client_id:      '',
    client_secret:  '',
    redirect_uris:  [`${host}/auth/google/callback`],
    response_types: ['code'],
  })

  const getAuth = ctx => {
    // const { provider } = ctx.params
    const code_verifier = generators.codeVerifier()
    ctx.session.code_verifier = code_verifier
    const code_challenge = generators.codeChallenge(code_verifier)

    const authorizationUrl = client.authorizationUrl({
      code_challenge,
      scope:                 'openid email profile',
      code_challenge_method: 'S256',
    })

    console.log(`Redirect to ${authorizationUrl}.`)
    ctx.redirect(authorizationUrl)
  }

  const getAuthCallback = async ctx => {
    console.log({ session: ctx.session })
    const { code_verifier } = ctx.session

    const parameters = client.callbackParams(ctx.request)
    // const { provider } = ctx.params
    console.log('back with params', parameters)
    const tokenSet = await client.callback(
      `${host}/auth/google/callback`, parameters, { code_verifier },
    )

    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    ctx.set('Pragma', 'no-cache')
    ctx.set('Expires', 0)
    const userData = tokenSet.claims()
    ctx.session.user = { displayName: userData.name, avatar: userData.picture }
    ctx.body = `
      <script>
        window.opener.postMessage({
          authenticated: true,
          user: ${JSON.stringify(ctx.session.user)}
        }, '*')
        window.close()
      </script>
    `
  }

  router.get('/auth/:provider', getAuth)
  router.get('/auth/:provider/callback', getAuthCallback)
}

module.exports = authentication
