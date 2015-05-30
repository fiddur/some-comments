/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See
 * the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

var istanbulMiddleware = require('istanbul-middleware')
var coverage = (process.env.COVERAGE == 'true')
if (coverage) {
  console.log('Hook loader for coverage - ensure this is not production!');
  istanbulMiddleware.hookLoader(__dirname);
}

var express          = require('express')
var morgan           = require('morgan')
var cors             = require('cors')
var bodyParser       = require('body-parser')
var cookieSession    = require('cookie-session')
var expressHbs       = require('express-handlebars')
var nodemailer       = require('nodemailer')

var Authentication   = require('./authentication')
var CommentFactory   = require('./models/comment.js')
var UserFactory      = require('./models/user.js')
var SiteFactory      = require('./models/site.js')

var SiteRoutes       = require('./routes/sites.js')
var CommentRoutes    = require('./routes/comments.js')

var app = express()

if (coverage) {app.use('/coverage', istanbulMiddleware.createHandler())}
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cookieSession({httpOnly: false, keys: ['ett', 'två']}))
app.use(express.static(__dirname + '/public'))

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// Setup an error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500)
  console.log(err)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

app.set('views', __dirname + '/views')
app.engine('hbs', expressHbs({extname: 'hbs', defaultLayout: 'main.hbs'}))
app.set('view engine', 'hbs')

function start(db, config) {
  var mailTransport = nodemailer.createTransport() /// @todo add config.mail
  var commentFactory = CommentFactory(db, mailTransport)
  var siteFactory    = SiteFactory(db)
  var userFactory    = UserFactory(db)

  // Setup Cross-origin resource sharing
  app.use(cors({
    origin: function(origin, callback) {
      console.log('Checking if cors is allowed by', origin)
      if (typeof origin === 'undefined') {return callback(null, true)}
      siteFactory.getByOrigin(origin).then(
        function(site) {
          callback(null, true)
        },
        function(error) {
          console.log(error)
          callback(null, false)
        }
      )
    },
    credentials: true
  }))


  var port = process.env.PORT || config.server.port || null
  server = app.listen(port)
  config.server.port = server.address().port

  console.log('Express server listening on port %d in %s mode', config.server.port,
              app.settings.env)

  var host = config.server.protocol + '://' + config.server.domain + ':' + config.server.port
  config.host = host

  // Authentication strategies
  Authentication.setup(app, db, config)

  // Setup routes
  SiteRoutes(app, siteFactory, config)
  CommentRoutes(app, commentFactory)

  // routes
  app.use('/users', require('./routes/users')(userFactory))
  app.get('/', function(req, res) {res.render('index')})

  app.get('/ping', function(req, res) {res.send('pong')})

  app.get('/test', function(req, res) {
    siteFactory.getByOrigin(config.server.protocol + '://' + config.server.domain)
      .then(function(site) {
        return site // Chain it for creation below
      }, function(error) {
        console.log('There is no test site created!', error)
        return siteFactory.create(config.server.domain)
      })
      .then(function(site) {
        console.log('NOW we have site.', site)

        res.render('test', {config: config, site: site.id})
      })
      .done()
  })
}
exports.start = start
