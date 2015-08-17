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

var user           = require('./user')
var site           = require('./site')
var account        = require('./account')
var page           = require('./page')
var comment        = require('./comment')
var oidc           = require('./oidc')
var oidcIdentifier = require('./oidc_identifier')

var Q           = require('q')
var qOrm        = require('q-orm')
var modts       = require('orm-timestamps')

module.exports = function(config) {
  var model = {}
  var db

  return qOrm.qConnect(config.database)
    .then(function(dbIn) {
      db = dbIn

      // Use timestamps in all models.
      db.use(modts, {persist: true})

      var User           = user(db, config)
      var Site           = site(db, User)
      var Account        = account(db, User)
      var Page           = page(db, Site, User)
      var Comment        = comment(db, User, Page)
      var Oidc           = oidc(db)
      var OidcIdentifier = oidcIdentifier(db, Oidc)

      model = {
        User:           User,
        Site:           Site,
        Account:        Account,
        Page:           Page,
        Comment:        Comment,
        Oidc:           Oidc,
        OidcIdentifier: OidcIdentifier,
      }

      // Superadmins
      model.Superadmin = db.qDefine('superadmin', {})
      model.Superadmin.hasOne('user', model.User.orm, {key: true})

      return config.model = model
    })
}
