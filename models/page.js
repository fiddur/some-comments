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
  function Page() {Model.apply(this, arguments)}
  Model.extend(Page)

  Page.tableName = 'pages';

  Page.get = function(id) {return Page.query().where('id', id).first()}

  Page.create = async(function(data) {
    // Get site.
    var site = (data.site instanceof models.Site) ? data.site : await(models.Site.get(data.site))
    data.site = site.id

    // Insert
    var page = await(Page.query().insert(data))

    // Subscribe all admins to comments on this new page.
    var admins = await(site.getAdmins())
    await(admins.map(function (admin) {return admin.subscribe(page)}))

    return page
  })

  Page.prototype.getComments = function() {return models.Comment.getByPage(this)}

  return Page




  var orm = db.define('pages', {
    id:  {type: 'serial', key: true},
    url: {type: 'text', size: 255, unique: true}
  })
  orm.hasOne('site', Site.orm, {key: true})
  orm.hasMany('subscribers', User.orm, {}, {
    mergeTable:   'subscriptions',
    mergeId:      'pageId',
    mergeAssocId: 'userId',
    reverse:      'subscriptions',
    key:          true
  })

  Page.orm = Promise.promisifyAll(orm)

  /**
   * Gets a page either by url or id.
   */
  Page.get = async(function(id) {
    var page = Promise.promisifyAll(await(Page.orm.find().where('id = ? OR url = ?', [id, id])))
    console.log(page)
    return page[0]
  })

  Page.getBySiteUrl = function(site, url) {
    return Page.orm.qOne({site: site, url: url})
  }

  return Page
}
