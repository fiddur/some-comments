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

var Model = require('objection').Model

module.exports = function(models) {
  function Comment() {Model.apply(this, arguments)}
  Model.extend(Comment)

  Comment.tableName = 'comments';

  Comment.create = async(function(data) {
    if (data.user instanceof models.User) {data.user = data.user.id}
    if (data.page instanceof models.Page) {data.page = data.page.id}

    // Without await here, it somehow doubled the inserts…
    return await(Comment.query().insert(data))
  })

  Comment.getByPage = function(page) {
    return Comment.query().where('page', page.id)
  }

  return Comment
}
