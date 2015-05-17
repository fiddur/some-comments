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
var passport         = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy
var GithubStrategy   = require('passport-github').Strategy
var GoogleOauth2     = require('passport-google-oauth2').Strategy
var cookieSession    = require('cookie-session')
var expressHbs       = require('express3-handlebars')

var SiteFactory      = require('./models/site.js')
var CommentFactory   = require('./models/comment.js')
var SiteRoutes       = require('./routes/sites.js')
var CommentRoutes    = require('./routes/comments.js')

var app = express()

if (coverage) {app.use('/coverage', istanbulMiddleware.createHandler())}
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cookieSession({httpOnly: false, keys: ['ett', 'två']}))
app.use(express.static(__dirname + '/public'))
app.use(passport.initialize())
app.use(passport.session())

// Setup Cross-origin resource sharing
app.use(cors({
  origin: function(origin, callback) {
    console.log('Checking if cors is allowed by', origin)
    if (typeof origin === 'undefined') {return callback(null, true)}
    Site.getByOrigin(origin).then(
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
  var UserFactory = require('./models/user.js')(db)

  // serialize and deserialize
  passport.serializeUser(function(user, done) {
    done(null, user.id)
  })
  passport.deserializeUser(function(id, done) {
    UserFactory.getById(id)
      .then(
        function(user)  {done(null, user)},
        function(error) {done(error, null)}
      )
  })

  var port = process.env.PORT || config.port || null
  server = app.listen(port)
  console.log('Express server listening on port %d in %s mode', server.address().port,
              app.settings.env)

  // Authentication strategies
  if (typeof config.connectors.facebook !== 'undefined') {
    passport.use(new FacebookStrategy(
      {
        clientID:     config.connectors.facebook.clientId,
        clientSecret: config.connectors.facebook.clientSecret,
        callbackURL:  config.connectors.facebook.callbackUrl
      },
      function(accessToken, refreshToken, profile, done) {

        Account.getOrCreate('Facebook', profile._json.id, {
          displayName: profile.displayName,
          avatar:      'http://graph.facebook.com/' + profile._json.id + '/picture',
        })
          .then(function(account) {
            console.log("Authenticated with account:", account)
            return UserFactory.getById(account.user)
          })
          .then(function(user) {
            console.log("Authenticated with user:", user)
            done(null, user)
          })
      }
    ))

    app.get('/auth/facebook', passport.authenticate('facebook'))
    app.get(
      '/auth/facebook/callback',
      passport.authenticate('facebook', {failureRedirect: '/login'}),
      function(req, res) {res.redirect('/account')}
    )
  }

  if (typeof config.connectors.googleOuth2 !== 'undefined') {
    passport.use(new GoogleOauth2(
      {
        clientID:     config.connectors.googleOauth2.clientId,
        clientSecret: config.connectors.googleOauth2.clientSecret,
        callbackURL:  config.connectors.googleOauth2.callbackUrl,
        passReqToCallback: true
      },
      function(request, accessToken, refreshToken, profile, done) {
        console.log('Callback from google oauth2', profile)

        /// @todo Check if there is a photo

        Account.getOrCreate('GoogleOauth2', profile.id, {
          displayName: profile.displayName,
          avatar:      profile.photos[0].value,
        })
          .then(function(account) {
            console.log('Authenticated with account:', account)
            return UserFactory.getById(account.user)
          })
          .then(function(user) {
            console.log('Authenticated with user:', user)
            done(null, user)
          })
      }
    ))

    app.get(
      '/auth/googleOauth2',
      passport.authenticate(
        'google', {
          scope:
          [ 'https://www.googleapis.com/auth/plus.login', ,
            'https://www.googleapis.com/auth/plus.profile.emails.read' ]
        }
      ))
    app.get(
      '/auth/googleOauth2/callback',
      passport.authenticate( 'google', {
        successRedirect: '/account',
        failureRedirect: '/login'
      })
    )
  }

  // Setup routes

  SiteRoutes(app, SiteFactory(db), config)
  CommentRoutes(app, CommentFactory(db))


  // test authentication
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next() }
    res.redirect('/')
  }

  // routes
  app.get('/', function(req, res) {res.render('index')})
  app.get('/login', function(req, res) {res.render('login')})

  app.get('/ping', function(req, res) {res.send('pong')})

  app.get('/account', ensureAuthenticated, function(req, res) {
    res.render('account', {user: req.user})
  })

  app.get('/', function(req, res) {
    res.render('login', {user: req.user})
  })

  app.get('/logout', function(req, res) {
    req.logout()
    res.redirect('/')
  })

  /**
   * REST API for /users/
   */

  /// Special shortcut for currently logged in.
  app.get('/users/me', function(req, res) {
    if (typeof req.user === 'undefined') {
      return res.sendStatus(204) // No Content
    }

    res.json(req.user)
  })
}
exports.start = start
