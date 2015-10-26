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

var url = require('url')

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
var SiteRoutes       = require('./routes/sites')
var CommentRoutes    = require('./routes/comments')

exports.start = function start(model, config) {
  var app = express()

  if (coverage) {app.use('/coverage', istanbulMiddleware.createHandler())}

  app.use(morgan('combined'))
  app.use(express.static(__dirname + '/public'))
  app.use(bodyParser.json())
  app.use(cookieSession({httpOnly: false, keys: ['ett', 'två']}))

  // development error handler, will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500)
      res.render('error', {message: err.message, error: err})
    })
  }

  // Setup an error handler
  app.use(function(err, req, res, next) {
    res.status(err.status || 500)
    console.log(err)
    res.render('error', {message: err.message, error: {}})
  })

  var mailTransport = nodemailer.createTransport(config.mailTransport)

  // Setup Cross-origin resource sharing
  app.use(cors({
    origin: function(origin, callback) {
      if (typeof origin === 'undefined') {return callback(null, true)}
      model.Site.getByOrigin(origin)
        .then(function(site) {
          if (site) {
            callback(null, true)
          }
          else {
            callback(null, false)
          }
        }).done()
    },
    credentials: true
  }))

  config.baseUrl = url.parse(config.baseUrl)
  config.baseUrl.toString = function() {return url.format(this)}

  var port   = process.env.PORT || config.baseUrl.port || null
  var server = app.listen(port, (listening) => {
    // Store port in config, if it wasn't there already.
    config.baseUrl.host = null // Remove host, since hostname and port should be set now.
    config.baseUrl.port = server.address().port

    console.log('Express server listening on port %d in %s mode', config.baseUrl.port,
                app.settings.env)
  })

  // Authentication strategies
  Authentication.setup(app, model, config)

  // Setup routes
  SiteRoutes(app, model, config)
  CommentRoutes(app, model, mailTransport, config)

  // routes
  app.use('/users', require('./routes/users')(model, config))
  app.get('/', function(req, res) {res.render('index')})

  app.get('/ping', function(req, res) {res.send('pong')})

  app.get('/test', function(req, res) {
    model.Site.getByDomain(config.baseUrl.host)
      .then(function(site) {
        if (site) {return site} // Chain it for creation below

        return model.Site.create({domain: config.baseUrl.host})
      })
      .then(function(site) {
        res.render('test', {config: config, site: site.id})
      })
      .done()
  })

  app.set('views', __dirname + '/views')
  app.engine('hbs', expressHbs({extname: 'hbs', defaultLayout: 'main.hbs'}))
  app.set('view engine', 'hbs')
}
