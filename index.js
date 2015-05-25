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

var q                = require('q')

var configFile = process.argv[2] || 'config.js'
var config = require('./' + configFile)
var server = require('./server.js')

var User    = require('./models/user.js')
var Site    = require('./models/site.js')
var Comment = require('./models/comment.js')

var qsqlite3 = require('q-sqlite3')

qsqlite3.createDatabase(config.database.connection.filename)
  .done(function(db) {
    setup_db(db)

    server.start(db, config)
  })


function setup_db(db) {
  // Setup tables
  db.run(
    'CREATE TABLE IF NOT EXISTS users ' +
      '(id INTEGER PRIMARY KEY, displayName STRING, avatar STRING)'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS accounts ' +
      '(id INTEGER PRIMARY KEY, uid STRING, system STRING, user INTEGER)'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS sites ' +
      '(id INTEGER PRIMARY KEY, domain STRING, maxLevels INTEGER)'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS siteadmins ' +
      '(site INTEGER, user INTEGER)'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS comments ' +
      '(id INTEGER PRIMARY KEY, text TEXT, user INTEGER, site INTEGER, ' +
      'page STRING, parent INTEGER, created DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
      'changed DATETIME, deleted DATETIME)'
  )
  db.run('CREATE TABLE IF NOT EXISTS subscription (page STRING, user INTEGER)')
  db.run('CREATE TABLE IF NOT EXISTS settings (key STRING, value STRING)')
  db.run('CREATE TABLE IF NOT EXISTS superadmins (user INTEGER)')
  db.run(
    'CREATE TABLE IF NOT EXISTS oidc (' +
      '  id               INTEGER PRIMARY KEY,' +
      '  issuer           STRING,' +
      '  authorizationURL STRING,' +
      '  tokenURL         STRING,' +
      '  userInfoURL      STRING,' +
      '  registrationURL  STRING,' +
      '  clientID         STRING,' +
      '  clientSecret     STRING,' +
      '  expiresAt        INTEGER' +
      ')'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS oidc_identifiers (' +
      '  oidc       INTEGER,' +
      '  identifier STRING' +
      ')'
  )

  db.run('CREATE UNIQUE INDEX IF NOT EXISTS domain ON sites (domain)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS system_uid ON accounts (system, uid)')
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS siteuser ON siteadmins (site, user)')
}
