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

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const url = require('url')

const Model = require('objection').Model

module.exports = (models) => {
  function Site() {Model.apply(this, arguments)}
  Model.extend(Site)

  Site.tableName = 'sites'

  Site.jsonSchema = {
    type: 'object',
    required: ['domain'],
    properties: {
      id: {type: 'integer'},
      domain: {type: 'string'},
      maxLevels: {type: 'integer'},
      createdAt: {type: 'string'},
      modifiedAt: {type: 'string'},
      settings: {
        type: 'object',
        properties: {
          sortOrder: {type: 'string'},
          useAvatar: {type: 'boolean'},
        }
      }
    }
  }

  Site.relationMappings = {
    admins: {
      relation: Model.ManyToManyRelation,
      modelClass: models.User,
      join: {
        from: 'sites.id',
        through: {
          from: 'siteadmins.siteId',
          to:   'siteadmins.userId',
        },
        to:   'users.id',
      }
    }
  }

  Site.create      = (data)     => Site.query().insert(data)
  Site.update      = (id, data) => Site.query().patch(data).where({id: id})
  Site.get         = (id)       => Site.query().where({id:     id    }).first()
  Site.getByDomain = (domain)   => Site.query().where({domain: domain}).first()

  /**
   * Get a Site by http origin header string.
   */
  Site.getByOrigin = (origin) => {
    const urlParts = url.parse(origin)
    return Site.getByDomain(urlParts.host)
  }

  /**
   * List all sites.
   */
  Site.all = () => Site.query()


  /************************************************************************************************
   * Instance methods
   ************************************************************************************************/

  Site.prototype.getAdmins = function() {
    return await(this.$loadRelated('admins')).admins
  }

  Site.prototype.addAdmin = function(admin) {
    const adminId = admin instanceof models.User ? admin.id : admin
    return models.SiteAdmin.query().insert({siteId: this.id, userId: adminId})
  }

  Site.prototype.getPages = function() {
    return await(models.Page.getAllBySite(this))
  }

  return Site
}
