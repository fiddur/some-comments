/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

'use strict'

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Model = require('objection').Model

module.exports = (models) => {
  function Comment() {Model.apply(this, arguments)}
  Model.extend(Comment)

  Comment.tableName = 'comments';

  Comment.relationMappings = {
    page: {
      relation: Model.OneToManyRelation,
      modelClass: models.Page,
      join: {
        from: 'comments.pageId',
        to:   'pages.id',
      }
    },
    user: {
      relation: Model.OneToOneRelation,
      modelClass: models.User,
      join: {
        from: 'comments.userId',
        to:   'users.id',
      }
    }
  }

  Comment.get = (id) => Comment.query().where('id', id).first()

  Comment.create = async((data) => {
    if (data.user instanceof models.User) {data.userId = data.user.id}
    if (data.page instanceof models.Page) {data.pageId = data.page.id}

    // Without await here, it somehow doubled the inserts…
    return await(Comment.query().insert(data))
  })

  Comment.prototype.$beforeInsert = function() {this.createdAt = new Date().toISOString()}

  Comment.prototype.setText = function(text) {
    this.text = text
    return this.$query().patch({text: text})
  }

  Comment.prototype.getPage = async(function() {
    if (this.page) {return this.page}

    await(this.$loadRelated('page'))
    return await(this.$loadRelated('page')).page
  })

  Comment.prototype.del = function() {return this.$query().delete()}

  return Comment
}
