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

const Model   = require('objection').Model

module.exports = (models) => {
  function Page() {Model.apply(this, arguments)}
  Model.extend(Page)

  Page.tableName = 'pages';

  Page.relationMappings = {
    site: {
      relation: Model.OneToOneRelation,
      modelClass: models.Site,
      join: {
        from: 'pages.siteId',
        to:   'sites.id',
      }
    },
    subscribers: {
      relation: Model.ManyToManyRelation,
      modelClass: models.User,
      join: {
        from: 'pages.id',
        through: {
          from: 'subscriptions.pageId',
          to:   'subscriptions.userId',
        },
        to:   'users.id',
      }
    }
  }

  Page.get = (id) => Page.query().where({id: id}).orWhere({url: id}).first()

  Page.create = async((data) => {
    // Get site.
    const site = data.site ? data.site : await(models.Site.get(data.siteId))
    data.siteId = site.id

    // Insert
    const page = await(Page.query().insert(data).eager('site'))

    // Subscribe all admins to comments on this new page.
    const admins = await(site.getAdmins())
    await(admins.map((admin) => admin.subscribe(page)))

    return page
  })

  Page.getBySiteUrl = (site, url) => {
    if (site instanceof models.Site) {site = site.id}
    return Page.query().where({siteId: site, url: url}).first()
  }

  Page.getAllBySite = (site) => {
    if (site instanceof models.Site) {site = site.id}
    return Page.query().where({siteId: site})
  }

  /************************************************************************************************
   * Instance methods
   ************************************************************************************************/

  Page.prototype.getComments = async(function() {
    return await(this.$loadRelated('comments.user')).comments
  })

  Page.prototype.getReviews = async(function() {
    return await(this.$loadRelated('reviews.user')).reviews
  })

  Page.prototype.getSubscribers = async(function() {
    return await(this.$loadRelated('subscribers')).subscribers
  })

  Page.prototype.getSite = async(function() {
    if (this.site) {return this.site}
    return await(this.$loadRelated('site')).site
  })

  return Page
}
