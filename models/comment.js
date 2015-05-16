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

/**
 * Comment
 */
function Comment(id, text, user, page, parent, deleted) {
  this.id       = id
  this.text     = text
  this.user     = user
  this.page     = page
  this.parent   = parent
  this.deleted  = deleted
  this.children = null
}
Comment.get = function(id) {
  return global.app.locals.db
    .get('SELECT comments.id, comments.created, comments.parent, comments.text, comments.user, users.displayName, users.avatar FROM comments LEFT JOIN users ON users.id = comments.user WHERE comments.id=?',
         id)
}

Comment.add = function(site, page, user, text, parent) {
  console.log('Adding a comment for ' + site + ' on ' + page + ' by ' + user + ': ' + text)

  return global.app.locals.db
    .run('INSERT INTO comments (text, user, site, page, parent) VALUES (?,?,?,?,?)',
         text, user, site, page, parent)
    .then(function(result) {
      return Comment.get(result.lastID)
    })
}

Comment.getAllByPage = function(site, page) {
  console.log('Getting comments for site ' + site + ' and page ' + page)

  return global.app.locals.db
    .all('SELECT comments.id, comments.created, comments.parent, comments.text, comments.user, users.displayName, users.avatar FROM comments LEFT JOIN users ON users.id = comments.user WHERE site=? AND page=? AND deleted IS NULL ORDER BY comments.id',
         site, page)
    .then(function(commentRows) {
      var commentById = {}
      var usersToGet = []
      var comments = [] // Comments without parent

      for (var i = 0; i < commentRows.length; i++) {
        var comment = commentRows[i]

        comment.children = [] // We promise to fill in children for all comments.
        commentById[comment.id] = comment

        if (comment.parent === null) {comments.push(comment)}
        else {
          if (typeof commentById[comment.parent] === 'undefined') {
            throw 'Comment ' + comment.id + ' claims to have a parent that isn\'t loaded.'
          }

          commentById[comment.parent].children.push(comment)
        }
      }

      return comments
    })
}

module.exports = Comment
