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

'use strict'

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var Model   = require('objection').Model

module.exports = function(models) {
  function Site() {Model.apply(this, arguments)}
  Model.extend(Site)

  Site.tableName = 'sites'

  Site.relationMappings = {
    admins: {
      relation: Model.ManyToManyRelation,
      modelClass: models.User,
      join: {
        from: 'sites.id',
        through: {
          from: 'siteadmins.site',
          to:   'siteadmins.user',
        },
        to:   'users.id',
      }
    }
  }

  Site.create = function(data) {
    return Site.query().insert(data)
  }

  Site.get = function(id) {return Site.query().where('id', id).first()}

  Site.prototype.getAdmins = function() {
    return await(this.$loadRelated('admins')).admins
  }
  Site.prototype.addAdmin = function(admin) {
    var adminId = admin instanceof models.User ? admin.id : admin
    return models.SiteAdmin.query().insert({site: this.id, user: adminId})
  }

  /**
   * List all sites.
   */
  Site.all = function() {
    return Site.query()
  }

  return Site



  /**
   * Get a Site by http origin header string.
   */
  Site.getByOrigin = async(function(origin) {
    var sites = Site.query().where({domain: origin.split('//')[1]}).limit(1)
    if (sites.length === 0) {throw new Error('No domain found by origin: ' + origin)}
    return sites[0]
  })

  Site.getByDomain = function(domain) {
    return Site.orm.oneAsync({domain: domain})
  }

}
