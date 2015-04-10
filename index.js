var express = require('express')
var q = require('q')
global.app = express()
var passport = require('passport')
var config = require('./config.js')
//var LocalStrategy = require('passport-local').Strategy
var FacebookStrategy = require('passport-facebook').Strategy
var GithubStrategy = require('passport-github').Strategy
var GoogleStrategy = require('passport-google').Strategy
//var morgan = require('morgan')
var cookieSession = require('cookie-session')

var users = {
  fiddur: { username: 'fiddur', password: 'secret', email: 'fredrik@liljegren.org' }
}

function User(id, displayName) {
  this.id          = id
  this.displayName = displayName
}
User.getById = function(id) {
  var deferred = q.defer()

  global.app.locals.db.get('SELECT * FROM users WHERE id = ?', id, function(err, userData) {
    if (typeof userData === 'undefined') {
      deferred.reject('No such user')
    }
    else {
      var user = new User(id, userData.displayName)
      deferred.resolve(user)
    }
  })

  return deferred.promise
}
User.create = function(displayName) {
  var deferred = q.defer()

  global.app.locals.db.run('INSERT INTO users (displayName) VALUES(?)', displayName, function(err) {
    deferred.resolve(new User(this.lastID, displayName))
  })

  return deferred.promise
}

function Account(id, uid, system, user) {
  this.id     = id
  this.uid    = uid
  this.system = system
  this.user   = user
}
Account.getOrCreate = function(system, uid, displayName) {
  var deferred = q.defer()

  global.app.locals.db.get(
    'SELECT * FROM accounts WHERE system = ? AND uid = ?',
    system, uid, function(err, account_data) {
      if (typeof account_data === 'undefined') {
        return User.create(displayName)
          .then(function(user) {
            global.app.locals.db.run(
              'INSERT INTO accounts (uid, system, user) VALUES (?,?,?)', uid, system, user.id,
              function(err) {
                deferred.resolve(new Account(this.lastID, uid, system, user.id))
              }
            )
          })
      }
      else {
        deferred.resolve(new Account(account_data.id, uid, system, account_data.user))
      }
    })

  return deferred.promise
}

// serialize and deserialize
passport.serializeUser(function(user, done) {
  console.log("Serializing user:", user)
  done(null, user.id)
})
passport.deserializeUser(function(id, done) {
  User.getById(id)
    .then(function(user) {
      console.log("Deserialized user:", user)
      done(null, user)
    }, function(error) {
      console.log(error)
      done(error, null)
    })
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
      console.log('Authenticated:', profile)
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

app.use(cookieSession({keys: ['ett', 'två']}))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(__dirname + '/public'))

// routes
app.get('/', function(req, res) {res.render('index')})

app.get('/ping', function(req, res) {res.send('pong')})

app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('account', { user: req.user })
})

app.get('/', function(req, res) {
  res.render('login', { user: req.user })
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


var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database(config.database.connection.filename)
app.locals.db = db

function setup_db(db) {
  // Setup tables
  db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, displayName STRING)')
  db.run('CREATE TABLE accounts (id INTEGER PRIMARY KEY, uid STRING, system STRING, user INTEGER)')
  db.run('CREATE TABLE sites (id INTEGER PRIMARY KEY, domain STRING, maxLevels INTEGER)')
  db.run('CREATE TABLE siteadmins (site INTEGER, user INTEGER)')
  db.run('CREATE TABLE comments (id INTEGER PRIMARY KEY, text TEXT, user INTEGER, page STRING, parent INTEGER, deleted DATETIME)')
  db.run('CREATE TABLE subscription (page STRING, user INTEGER)')
  db.run('CREATE TABLE settings (key STRING, value STRING)')
  db.run('CREATE TABLE superadmins (user INTEGER)')
}
//setup_db(db)
