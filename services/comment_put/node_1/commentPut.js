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

const addComment = ({ es, body, page, user }) => es.appendToStream(
  `page-${page}`, esClient.expectedVersion.any, [
    esClient.createJsonEventData(
      uuid.v4(), { body, page, user }, null, 'CommentAdded',
    ),
  ]
)

const handleRequest = es => async (req, res) => {
  try {
    const { page, body } = await getPayload(req)
    const accessToken = req.headers.authorization.slice('Bearer '.length)
    console.log({ accessToken })
    const { user } = jwt.verify(accessToken, accessTokenSecret)

    await addComment({ es, body, page, user })
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
