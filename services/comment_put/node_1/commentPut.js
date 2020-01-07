const esClient = require('node-eventstore-client')
const http     = require('http')
const jwt      = require('jsonwebtoken')
const uuid     = require('uuid')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
const esEndpoint        = process.env.ES_ENDPOINT
const port              = process.env.PORT || 3002

const getPayload = req => new Promise((resolve, reject) => {
  let payload = ''
  req.on('error', reject)
  req.on('data', chunk => { payload += chunk })
  req.on('end', () => {
    try { resolve(JSON.parse(payload)) }
    catch (err) { reject(err) }
  })
})

const parseCookies = cookie => cookie.split(';').reduce(
  (prev, curr) => {
    const cookies = { ...prev }
    const m = / *([^=]+)=(.*)/.exec(curr)
    cookies[m[1]] = decodeURIComponent(m[2])
    return cookies
  }, {}
)

const addComment = ({ es, body, page, user }) => es.appendToStream(
  `page-${page}`, esClient.expectedVersion.any, [
    esClient.createJsonEventData(
      uuid.v4(), { body, page, user }, null, 'CommentAdded',
    ),
  ]
)

const authenticate = req => {
  if (!req.headers.cookie) return null

  const { accessToken } = parseCookies(req.headers.cookie)
  if (!accessToken) return null

  const { user } = jwt.verify(accessToken, accessTokenSecret)
  return user
}

const handleRequest = es => async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  res.setHeader('Access-Control-Allow-Methods', 'PUT, GET')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  try {
    const user = authenticate(req)
    if (!user) {
      res.statusCode = 401
      return void res.end('Forbidden')
    }

    const { page, body } = await getPayload(req)
    await addComment({ es, body, page, user })
    console.log('comment added', { body, page, user })
    res.end()
  } catch (err) {
    console.log(err)
    res.statusCode = 500
    res.end(err.message)
  }
}

async function main() {
  const es = esClient.createConnection({}, esEndpoint)
  const server = http.createServer(handleRequest(es))
  es.connect()
  await new Promise(resolve => es.once('connected', resolve))
  server.listen(port, err => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`listening on port ${port} in process ${process.pid}.`)
  })
}

main()
