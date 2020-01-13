const esClient   = require('node-eventstore-client')
const { uuid }   = require('uuidv4')
const Koa        = require('koa')
const koaBody    = require('koa-body')
const koaJwt     = require('koa-jwt')
const koaRouter  = require('koa-router')
const koaSession = require('koa-session2')
const cors       = require('@koa/cors')

const authentication = require('./routers/authentication')
const config = require('./config')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'changeme'
const esEndpoint        = process.env.ES_ENDPOINT || 'tcp://localhost:1113'
const port              = process.env.PORT || 3000

const getComments = es => async ctx => {
  const { page } = ctx.params
  const { events } = await es.readStreamEventsForward(`page-${page}`, 0, 1000)

  const comments = events
    .map(e => ({ ...JSON.parse(e.event.data.toString()), createdAt: e.event.created }))
    .filter(c => 'user' in c)
    .filter(c => 'text' in c)

  ctx.body = JSON.stringify(comments)
}

const putComment = es => async ctx => {
  if (!ctx.state.user) {
    ctx.status = 401
    return
  }

  const { user } = ctx.state

  const { text } = ctx.request.body
  const { id, page } = ctx.params

  const event = esClient.createJsonEventData(
    uuid(), { comment: id, text, user }, null, 'CommentAdded'
  )
  await es.appendToStream(`page-${page}`, esClient.expectedVersion.any, event)

  ctx.body = JSON.stringify({ text, user })
}

const main = async () => {
  console.log('setting up')
  const app = new Koa()
  app.use(koaBody({ jsonLimit: '1kb' }))
  app.use(cors({ credentials: true, exposeHeaders: ['content-type'] }))
  app.use(koaJwt({ secret: accessTokenSecret, passthrough: true }))
  app.use(koaSession())

  const router = koaRouter()

  const es = esClient.createConnection({}, esEndpoint)
  console.log('connecting es')
  es.connect()
  console.log('connection initiated')
  await new Promise(resolve => es.once('connected', resolve))
  console.log('connected es')

  app.use(await authentication({ accessTokenSecret, config, es }))
  router
    .get('/pages/:page/comments', getComments(es))
    .put('/pages/:page/comments/:id', putComment(es))

  app.use(router.routes())

  app.listen({ port, host: '0.0.0.0' })
  console.log('Listening')
}

main()
