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

module.exports = function(db, Site, User) {
  var Page = {}

  Page.orm = db.qDefine('pages', {
    id:  {type: 'serial', key: true},
    url: {type: 'text', size: 255, unique: true}
  })
  Page.orm.qHasOne('site', Site.orm, {key: true})
  Page.orm.qHasMany('subscribers', User.orm, {}, {
    mergeTable:   'subscriptions',
    mergeId:      'pageId',
    mergeAssocId: 'userId',
    reverse:      'subscriptions',
    key:          true
  })

  Page.get = function(id) {return Page.orm.qGet(id)}

  Page.create = async(function(data) {
    if (data.site) {data.site_id = data.site.id}

    var page   = await(Page.orm.qCreate([data]))[0]
    var site   = await(page.qGetSite())
    var admins = await(site.qGetAdmins())

    // Subscribe all admins to comments on this new page.
    await(admins.map(function (admin) {return admin.subscribe(page)}))

    return page
  })

  Page.getBySiteUrl = function(site, url) {
    return Page.orm.qOne({site: site, url: url})
  }

  return Page
}
