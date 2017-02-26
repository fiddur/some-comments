const url = require('url')

const istanbulMiddleware = require('istanbul-middleware')
const coverage = (process.env.COVERAGE == 'true')
if (coverage) {
  console.log('Hook loader for coverage - ensure this is not production!')
  istanbulMiddleware.hookLoader(__dirname)
}

const express          = require('express')
const morgan           = require('morgan')
const cors             = require('cors')
const bodyParser       = require('body-parser')
const cookieSession    = require('cookie-session')
const expressHbs       = require('express-handlebars')
const nodemailer       = require('nodemailer')

const Authentication   = require('./authentication')
const SiteRoutes       = require('./routes/sites')
const CommentRoutes    = require('./routes/comments')
const ReviewRoutes     = require('./routes/reviews')

exports.start = function start(model, config) {
  const app = express()

  if (coverage) { app.use('/coverage', istanbulMiddleware.createHandler()) }

  app.use(morgan('combined'))
  app.use(express.static(`${__dirname}/public`))
  app.use(bodyParser.json())
  app.use(cookieSession({ httpOnly: false, keys: ['ett', 'två', ] }))

  // development error handler, will print stacktrace
  if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
      res.status(err.status || 500)
      res.render('error', { message: err.message, error: err })
    })
  }

  // Setup an error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500)
    console.log(err)
    res.render('error', { message: err.message, error: {} })
  })

  const mailTransport = nodemailer.createTransport(config.mailTransport)

  // Setup Cross-origin resource sharing
  app.use(cors({
    origin(origin, callback) {
      if (typeof origin === 'undefined') { return callback(null, true) }
      model.Site.getByOrigin(origin)
        .then(site => {
          if (site) {
            callback(null, true)
          }          else {
            callback(null, false)
          }
        }).done()
    },
    credentials: true,
  }))

  config.baseUrl = url.parse(config.baseUrl)
  config.baseUrl.toString = function () { return url.format(this) }

  const port   = process.env.PORT || 3000
  const server = app.listen(port, listening => {
    // // Store port in config, if it wasn't there already.
    // config.baseUrl.host = null // Remove host, since hostname and port should be set now
    // config.baseUrl.port = server.address().port

    console.log('Express server listening on port %d in %s mode', server.address().port,
                app.settings.env)
  })

  // Authentication strategies
  Authentication.setup(app, model, config)

  // Setup routes
  SiteRoutes(app, model, config)
  CommentRoutes(app, model, mailTransport, config)
  ReviewRoutes(app, model, config)

  // routes
  app.use('/users', require('./routes/users')(model, config))
  app.get('/', (req, res) => { res.render('index') })

  app.get('/ping', (req, res) => { res.send('pong') })

  app.get('/test', (req, res) => {
    const host = `${config.baseUrl.hostname}:${config.baseUrl.port}`
    model.Site.getByDomain(host)
      .then(site => {
        if (site) { return site } // Chain it for creation below

        return model.Site.create({ domain: host })
      })
      .then(site => {
        res.render('test', { config, site: site.id })
      })
      .done()
  })

  app.set('views', `${__dirname}/views`)
  app.engine('hbs', expressHbs({ extname: 'hbs', defaultLayout: 'main.hbs' }))
  app.set('view engine', 'hbs')
}
