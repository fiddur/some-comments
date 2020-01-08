const esClient  = require('node-eventstore-client')
const jwt       = require('jsonwebtoken')
// const uuid      = require('uuid')
const Koa       = require('koa')
const koaBody   = require('koa-body')
const koaRouter = require('koa-router')
const session   = require('koa-session2')
const cors      = require('@koa/cors')

const authentication = require('./routers/authentication')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'changeme'
const esEndpoint        = process.env.ES_ENDPOINT || 'tcp://localhost:1113'
const port              = process.env.PORT || 3000

const getComments = es => ctx => {
  ctx.body = JSON.stringify([{ text: 'hej', user: { displayName: 'No One' } }])
}

const putComment = es => ctx => {
  const { user } = ctx.session
  if (!user) {
    ctx.status = 401
    return
  }

  const { text } = ctx.request.body
  // const { id, page } = ctx.params

  ctx.body = JSON.stringify({ text, user })
}

const main = async () => {
  console.log('setting up')
  const app = new Koa()
  app.use(koaBody({ jsonLimit: '1kb' }))
  app.use(cors({ credentials: true, exposeHeaders: ['content-type'] }))
  app.use(session())

  const router = koaRouter()

  const es = esClient.createConnection({}, esEndpoint)
  console.log('connecting es')
  es.connect()
  console.log('connection initiated')
  await new Promise(resolve => es.once('connected', resolve))
  console.log('connected es')

  router
    .get('/pages/:page/comments', getComments(es))
    .put('/pages/:page/comments/:id', putComment(es))
  authentication({ es, router })

  app.use(router.routes())

  app.listen({ port, host: '0.0.0.0' })
  console.log('Listening')
}

main()
