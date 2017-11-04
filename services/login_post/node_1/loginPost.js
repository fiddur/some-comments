const esClient = require('node-eventstore-client')
const http = require('http')

const eventstoreEndpoint = process.env.ES_ENDPOINT

const server = http.createServer((req, res) => res.end('{"access_token": "myToken"}'))

const port = process.env.PORT || 3001

process.on('SIGINT', () => process.exit(0))

async function main() {
  await new Promise(resolve => {
    // TODO: Add credentials.
    eventStore = esClient.createConnection({}, eventstoreEndpoint)
    eventStore.connect()
    eventStore.once('connected', resolve)
  })

  server.listen(port, err => {
    console.log(`listening on port ${port} in process ${process.pid}.`)
  })
}

main()
