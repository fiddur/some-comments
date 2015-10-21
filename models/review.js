/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren, Sören Jensen
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

const Model = require('objection').Model

module.exports = (models) => {
  function Review() {Model.apply(this, arguments)}
  Model.extend(Review)

  Review.tableName = 'reviews'

  Review.relationMappings = {
    page: {
      relation: Model.OneToManyRelation,
      modelClass: models.Page,
      join: {
        from: 'reviews.pageId',
        to:   'pages.id',
      }
    },
    user: {
      relation: Model.OneToOneRelation,
      modelClass: models.User,
      join: {
        from: 'reviews.userId',
        to:   'users.id',
      }
    }
  }

  Review.get = (id) => Review.query().where('id', id).first()

  Review.getByComment = (comment) => Review.query().where('commentId', comment).first()

  Review.create = async((data) => {
    if (data.user instanceof models.User) {data.userId = data.user.id}
    if (data.page instanceof models.Page) {data.pageId = data.page.id}

    // Without await here, it somehow doubled the inserts…
    return await(Review.query().insert(data))
  })

  Review.prototype.$beforeInsert = function() {this.createdAt = new Date().toISOString()}

  Review.prototype.setGrade = function(grade) {
    this.grade = grade
    return this.$query().patch({grade: grade})
  }

  Review.prototype.getPage = async(function() {
    if (this.page) {return this.page}

    await(this.$loadRelated('page'))
    return await(this.$loadRelated('page')).page
  })

  Review.prototype.del = function() {return this.$query().delete()}

  return Review
}
