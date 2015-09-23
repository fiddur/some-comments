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

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var user           = require('./user')
var site           = require('./site')
var account        = require('./account')
var page           = require('./page')
var comment        = require('./comment')
var siteadmin      = require('./siteadmin')
var subscription   = require('./subscription')
var oidc           = require('./oidc')
var oidcIdentifier = require('./oidc_identifier')

var Promise = require('bluebird')
var orm     = Promise.promisifyAll(require('orm'))
var modts   = require('orm-timestamps')

module.exports = async(function(config) {
  var Knex = require('knex')
  var Model = require('objection').Model

  var knex = Knex(config.database)
  Model.knex(knex);

  var model = {}

  model.User           = user(model, config)
  model.Site           = site(model)
  model.Page           = page(model)
  model.Comment        = comment(model)
  model.Account        = account(model)
  model.SiteAdmin      = siteadmin(model)
  model.Subscription   = subscription(model)
  //var Oidc           = oidc(db)
  //var OidcIdentifier = oidcIdentifier(db, Oidc)

  //// Superadmins
  //model.Superadmin = db.define('superadmin', {})
  //model.Superadmin.hasOne('user', model.User.orm, {key: true})

  if (config.testMode) {
    await(knex.migrate.latest())
    //var MigrationTask = require('migrate-orm2')
    //var migrationTask = Promise.promisifyAll(new MigrationTask(db.driver, {dir: 'data/migrations'}))
    //await(migrationTask.upAsync(null))

  }

  return config.model = model
})
