const esClient = require('node-eventstore-client')
const http = require('http')
const uuid = require('uuid')
const jwt = require('jsonwebtoken')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
const esEndpoint = process.env.ES_ENDPOINT
const port = process.env.PORT || 3001
const usersStream = process.env.USERS_STREAM

process.on('SIGINT', () => process.exit(0))

const getPayload = req => new Promise((resolve, reject) => {
  let payload = ''
  req.on('error', reject)
  req.on('data', chunk => { payload += chunk })
  req.on('end', () => resolve(JSON.parse(payload)))
})

const registerUserUuid = ({ es, user, account }) => es.appendToStream(
  usersStream, esClient.expectedVersion.any, [
    esClient.createJsonEventData(
      uuid.v4(), { user, account }, null, null
    ),
  ]
)

const sendNewUserEvent = ({ es, user, displayName, account }) => es.appendToStream(
  user, esClient.expectedVersion.noStream, [
    esClient.createJsonEventData(
      uuid.v4(), { user, displayName, account }, null, 'new_user',
    ),
  ]
)

const handleRequest = es => async (req, res) => {
  const body = await getPayload(req)
  const user = uuid.v4()
  const account = body.account
  const [subject, issuer] = account.split('@')

  if (issuer === 'anonymous') {
    const displayName = subject

    await registerUserUuid({ es, user, account })
    await sendNewUserEvent({ es, user, displayName, account })

    const scope = ['comment']
    const access_token = jwt.sign({ user, scope }, accessTokenSecret)
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
