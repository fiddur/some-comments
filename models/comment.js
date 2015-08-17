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

module.exports = function(db, User, Page) {
  var Comment = {}

  Comment.orm = db.qDefine('comments', {
    id:        {type: 'serial', key: true},
    text:      {type: 'text'},
    deletedAt: {type: 'date', time: true},
  }, {
    timestamp: {
      createdProperty:  'createdAt',
      modifiedProperty: 'modifiedAt',
    }
  })
  Comment.orm.qHasOne('user',   User.orm,    {autoFetch: true, key: true})
  Comment.orm.qHasOne('page',   Page.orm,    {key: true, reverse: 'comments'})
  Comment.orm.qHasOne('parent', Comment.orm, {index: true})

  Comment.createMulti = function(datas) {
    var l = datas.length
    for (var i = 0; i < l; i++) {
      if (datas[i].page) {datas[i].page_id = datas[i].page.id}
      if (datas[i].user) {datas[i].user_id = datas[i].user.id}
    }

    return Comment.orm.qCreate(datas)
  }

  Comment.create = function(data) {
    return Comment.createMulti([data]).then(function(comments) {return comments[0]})
  }

  return Comment
}
