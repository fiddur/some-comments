const esClient = require('node-eventstore-client')
const http     = require('http')

const esEndpoint = process.env.ES_ENDPOINT
const port       = process.env.PORT || 3003

const getComments = async ({ es, site, page }) => {
  const eventSlice = await es.readStreamEventsForward(
    `page-${page}`, 0, 100
  )
  return eventSlice.events
  // filter on CommentAdded
}

const handleRequest = es => async (req, res) => {
  try {
    const urlRegexp = new RegExp('/sites/(.*)/pages/(.*)/comments/$')
    const [ url, site, page ] = urlRegexp.exec(req.url)
    console.log({ url, site, page })

    const comments = await getComments({ es, site, page })

    comments.push({ text: 'hej', user: { displayName: 'No One' } })

    res.end(JSON.stringify(comments))
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
