/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

var express          = require('express')
var q                = require('q')
var passport         = require('passport')
var bodyParser       = require('body-parser')
var config           = require('./config.js')
var FacebookStrategy = require('passport-facebook').Strategy
var GithubStrategy   = require('passport-github').Strategy
var GoogleStrategy   = require('passport-google').Strategy
var cookieSession    = require('cookie-session')
var cors             = require('cors')

var User    = require('./models/user.js')
var Account = require('./models/account.js')
var Site    = require('./models/site.js')
var Comment = require('./models/comment.js')

global.app = express()

// serialize and deserialize
passport.serializeUser(function(user, done) {
  done(null, user.id)
})
passport.deserializeUser(function(id, done) {
  User.getById(id)
    .then(
      function(user)  {done(null, user)},
      function(error) {done(error, null)}
    )
})

// config
passport.use(new FacebookStrategy(
  {
    clientID:     config.connectors.facebook.clientID,
    clientSecret: config.connectors.facebook.clientSecret,
    callbackURL:  config.connectors.facebook.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      Account.getOrCreate('Facebook', profile._json.id, profile.displayName)
        .then(function(account) {
          console.log("Authenticated with account:", account)
          return User.getById(account.user)
        })
        .then(function(user) {
          console.log("Authenticated with user:", user)
          done(null, user)
        })
    })
  }
))

app.set('views', __dirname + '/views')

var expressHbs = require('express3-handlebars')
app.engine('hbs', expressHbs({extname: 'hbs', defaultLayout: 'main.hbs'}))
app.set('view engine', 'hbs')

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(cookieSession({httpOnly: false, keys: ['ett', 'två']}))
app.use(passport.initialize())
app.use(passport.session())
app.use(function(req, res, next) {
  console.log(req.method + ' ' + req.protocol + '://' + req.headers.host + req.url, '' + req.user)
  next()
})

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

app.get(
  '/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res) {
  }
)
app.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/account')
  }
)
app.get('/logout', function(req, res) {
  req.logout()
  res.redirect('/')
})

// port
app.listen(1337)

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next() }
  res.redirect('/')
}


var sqlite3  = require('sqlite3').verbose()
var qsqlite3 = require('q-sqlite3')

qsqlite3.createDatabase(config.database.connection.filename)
  .done(function(db) {
    app.locals.db = db
    setup_db(db)
  })

function setup_db(db) {
  // Setup tables
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, displayName STRING, avatar STRING)')
  db.run('CREATE TABLE accounts (id INTEGER PRIMARY KEY, uid STRING, system STRING, user INTEGER)')
  db.run('CREATE TABLE sites (id INTEGER PRIMARY KEY, domain STRING, maxLevels INTEGER)')
  db.run('CREATE TABLE siteadmins (site INTEGER, user INTEGER)')
  db.run('CREATE TABLE comments (id INTEGER PRIMARY KEY, text TEXT, user INTEGER, site INTEGER, page STRING, parent INTEGER, created DATETIME DEFAULT CURRENT_TIMESTAMP, changed DATETIME, deleted DATETIME)')
  db.run('CREATE TABLE subscription (page STRING, user INTEGER)')
  db.run('CREATE TABLE settings (key STRING, value STRING)')
  db.run('CREATE TABLE superadmins (user INTEGER)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS domain ON sites (domain)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS system_uid ON accounts (system, uid)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS siteuser ON siteadmins (site, user)')
}



/**
 * REST API for /sites/
 */

/**
 * GET /sites/ to list all sites.
 */
app.get('/sites/', function(req, res) {
  var db = req.app.locals.db

  console.log('Listing sites.')
  db.all('SELECT * FROM sites ORDER BY id')
    .then(function(sitesData) {
      if (req.accepts('json', 'html') === 'json') {
        console.log('Rendering JSON')
        return res.json(sitesData)
      }

      console.log('Rendering HTML')
      res.render('sites/index', {sites: sitesData})
    })
})

/**
 * POST to /sites/ to create a new one.
 */
app.post('/sites/', function(req, res) {
  if (typeof req.body.domain === 'undefined') {
    return res.status(400).send('Bad Request: domain is required')
  }

  if (typeof req.user === 'undefined') {
    console.log('Unauthorized', req.headers.host, req.url)
    return res.status(401).send('Unauthorized')
  }

  Site.add(req.body.domain)
    .then(function(site) {
      site.addAdmin(req.user) // No need to wait for it to finish.
      res.status(201).location('/sites/' + site.id).send(site)
    }, function(error) {res.status(500).send(error)})
})

app.get('/sites/:site/pages/:page/comments/', function(req, res) {
  Comment.getAllByPage(req.params.site, req.params.page)
    .then(
      function(comments) {res.send(comments)},
      function(error)    {console.log(error); res.status(500).send(error)}
    )
})

app.post('/sites/:site/pages/:page/comments/', function(req, res) {
  if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

  if (typeof req.body.text === 'undefined') {
    return res.status(400).send('Bad Request: text is required')
  }

  Comment.add(req.params.site, req.params.page, req.user.id, req.body.text, null)
    .then(
      function(comment) {res.status(201).location(req.path + comment.id).send(comment)},
      function(error)   {res.status(500).send(error)}
    )
})
