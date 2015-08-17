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

module.exports = function(db, User) {
  var Site = {}

  Site.orm = db.qDefine('sites', {
    id:        {type: 'serial',  key:    true},
    domain:    {type: 'text',    unique: true},
    maxLevels: {type: 'integer', size:   2, defaultValue: 0},
  })
  Site.orm.qHasMany('admins', User.orm, {}, {reverse: 'sites', key: true, autoFetch: true})

  /**
   * List all sites.
   */
  Site.all = function() {
    return Site.orm.qAll()
  }

  Site.create = function(data) {
    return Site.orm.qCreate([data]).then(function(sites) {return sites[0]})
  }

  /**
   * Get a Site by http origin header string.
   */
  Site.getByOrigin = function(origin) {
    return Site.orm.qOne({domain: origin.split('//')[1]})
  }

  Site.getByDomain = function(domain) {
    return Site.orm.qOne({domain: domain})
  }

  return Site
}
