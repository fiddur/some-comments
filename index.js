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

global.app = express()

/**
 * User
 */
function User(id, displayName, avatar) {
  this.id          = id
  this.displayName = displayName
  this.avatar      = avatar
}
User.getById = function(id) {
  return global.app.locals.db
    .get('SELECT * FROM users WHERE id = ?', id)
    .then(function(userData) {
      if (typeof userData === 'undefined') {
        throw 'No user with id: ' + id
      }

      return new User(id, userData.displayName, userData.avatar)
    }, function(error) {
      console.log(error)
    })
}
User.create = function(displayName, avatar) {
  return global.app.locals.db
    .run('INSERT INTO users (displayName, avatar) VALUES(?,?)', displayName, avatar)
    .then(function(db) {
      return new User(db.lastID, displayName, avatar)
    })
}
User.prototype.toString = function() {
  return this.displayName + ' (' + this.id + ')'
}

/**
 * Account - representing a login account at a connected service like Google, Facebook, Openid etc.
 *
 * @param uid     The unique identifier on the connected system
 * @param system  The authentication system - normally the passport strategy used.
 * @param user    The User ID.
 */
function Account(id, uid, system, user) {
  this.id     = id
  this.uid    = uid
  this.system = system
  this.user   = user
}
Account.getOrCreate = function(system, uid, displayName) {
  return global.app.locals.db
    .get('SELECT * FROM accounts WHERE system = ? AND uid = ?', system, uid)
    .then(function(account_data) {
      if (typeof account_data === 'undefined') {
        return User.create(displayName, 'http://graph.facebook.com/' + uid + '/picture')
          .then(function(user) {
            return global.app.locals.db.run(
              'INSERT INTO accounts (uid, system, user) VALUES (?,?,?)', uid, system, user.id
            )
          }).then(function(db) {
            return new Account(db.lastID, uid, system, user.id)
          })
      }
      else {
        return new Account(account_data.id, uid, system, account_data.user)
      }
    })
}

/**
 * Site - a site to comment things on.
 */
function Site(id, domain) {
  this.id     = id
  this.domain = domain
}
Site.add = function(domain) {
  return global.app.locals.db
    .run('INSERT INTO sites (domain) VALUES (?)', domain)
    .then(function(db) {
      console.log('Created Site', db.lastID, domain)
      return new Site(db.lastID, domain)
    })
}
Site.prototype.addAdmin = function(user) {
  return global.app.locals.db
    .run('INSERT INTO siteadmins (site, user) VALUES (?,?)', this.id, user.id)
}

/**
 * Comment
 */
function Comment(id, text, user, page, parent, deleted) {
  this.id       = id
  this.text     = text
  this.user     = user
  this.page     = page
  this.parent   = parent
  this.deleted  = deleted
  this.children = null
}
Comment.add = function(site, page, user, text, parent) {
  console.log('Adding a comment for ' + site + ' on ' + page + ' by ' + user + ': ' + text)

  return global.app.locals.db
    .run('INSERT INTO comments (text, user, site, page, parent) VALUES (?,?,?,?,?)',
         text, user, site, page, parent)
}
Comment.getAllByPage = function(site, page) {
  console.log('Getting comments for site ' + site + ' and page ' + page)

  return global.app.locals.db
    .all('SELECT comments.id, comments.parent, comments.text, comments.user, users.displayName, users.avatar FROM comments LEFT JOIN users ON users.id = comments.user WHERE site=? AND page=? AND deleted IS NULL ORDER BY comments.id',
         site, page)
    .then(function(commentRows) {
      console.log(commentRows)

      var commentById = {}
      var usersToGet = []
      var comments = [] // Comments without parent

      for (var i = 0; i < commentRows.length; i++) {
        var comment = commentRows[i]

        comment.children = [] // We promise to fill in children for all comments.
        commentById[comment.id] = comment

        if (comment.parent === null) {comments.push(comment)}
        else {
          if (typeof commentById[comment.parent] === 'undefined') {
            throw 'Comment ' + comment.id + ' claims to have a parent that isn\'t loaded.'
          }

          commentById[comment.parent].children.push(comment)
        }
      }

      return comments
    })
}


// serialize and deserialize
passport.serializeUser(function(user, done) {
  console.log("Serializing user:", user)
  done(null, user.id)
})
passport.deserializeUser(function(id, done) {
  console.log('Deserializing user 1')
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

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(cookieSession({httpOnly: false, keys: ['ett', 'två']}))
app.use(passport.initialize())
app.use(passport.session())
app.use(function(req, res, next) {
  console.log('http://' + req.headers.host + req.url, req.user)
  next()
})

app.use(cors({credentials: true, origin: true}))

// routes
app.get('/', function(req, res) {res.render('index')})
app.get('/login', function(req, res) {res.render('login')})

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

  db.all('SELECT * FROM sites ORDER BY id')
    .then(function(sites_data) {
      res.json(sites_data)
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

  console.log(req.user)

  Site.add(req.body.domain)
    .then(function(site) {
      site.addAdmin(req.user) // No need to wait for it to finish.

      res
        .status(201)
        .location('/sites/' + site.id)
        .send('Created site ' + site.id + ' with admin ' + req.user)
    }, function(error) {
      res
        .status(500)
        .send(error)
    })
})

//app.use(function(err, req, res, next) {
//  console.error(err.stack)
//  res.status(500).send('Something broke!', err)
//})

app.get('/sites/:site/pages/:page/comments/', function(req, res) {
  console.log('Getting comments')
  Comment.getAllByPage(req.params.site, req.params.page)
    .then(function(comments) {
      console.log('Sending comments')
      res.send(comments)
    }, function(error) {console.log(error); res.status(500).send(error)})
})

app.post('/sites/:site/pages/:page/comments/', function(req, res) {
  if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

  if (typeof req.body.text === 'undefined') {
    return res.status(400).send('Bad Request: text is required')
  }

  Comment.add(req.params.site, req.params.page, req.user.id, req.body.text, null)
    .then(function(comment) {
      console.log('Comment added', comment)
      res.status(201).location(req.path + comment.id).send(comment)
    }, function(error) {res.status(500).send(error)})
})

// @license-end
