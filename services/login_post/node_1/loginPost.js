const esClient = require('node-eventstore-client')
const http = require('http')
const uuid = require('uuid')
const jwt = require('jsonwebtoken')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
const esEndpoint = process.env.ES_ENDPOINT
const port = process.env.PORT || 3001

process.on('SIGINT', () => process.exit(0))

const getPayload = req => new Promise((resolve, reject) => {
  let payload = ''
  req.on('error', reject)
  req.on('data', chunk => { payload += chunk })
  req.on('end', () => resolve(JSON.parse(payload)))
})

const addUser = ({ es, user, displayName, account }) => es.appendToStream(
  `user-${user}`, esClient.expectedVersion.noStream, [
    esClient.createJsonEventData(
      uuid.v4(), { user, displayName, account }, null, 'UserAdded',
    ),
  ]
)

const handleRequest = es => async (req, res) => {
  const { account } = await getPayload(req)
  const [subject, issuer] = account.split('@')

  if (issuer === 'anonymous') {
    const displayName = subject
    const user = uuid.v4()

    await addUser({ es, user, displayName, account })

    const scope = ['comment']
    const access_token = jwt.sign({ user, scope }, accessTokenSecret)
    // TODO: Return stream version as ETag
    res.end(JSON.stringify({ access_token }))
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
