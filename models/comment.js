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

var CommentFactoryPrototype = {}
function CommentFactory(db, mailTransport) {
  var cf = Object.create(CommentFactoryPrototype)
  cf.db = db
  cf.mailTransport = mailTransport
  return cf
}

CommentFactoryPrototype.getById = function(id) {
  return this.db
    .get(
      'SELECT comments.id, comments.created, comments.parent, comments.text, comments.user, ' +
        '     users.displayName, users.avatar ' +
        'FROM comments ' +
        '  LEFT JOIN users ON users.id = comments.user ' +
        'WHERE comments.id=?',
      id
    )
}

CommentFactoryPrototype.create = function(site, page, user, text, parent) {
  var self = this

  return this.db
    .run('INSERT INTO comments (text, user, site, page, parent) VALUES (?,?,?,?,?)',
         text, user, site, page, parent)
    .then(function(result) {
      return self.getById(result.lastID)
    })
}

CommentFactoryPrototype.getAllByPage = function(siteId, page) {
  return this.db.all(
    'SELECT comments.id, comments.created, comments.parent, comments.text, comments.user, ' +
      '     users.displayName, users.avatar ' +
      'FROM comments ' +
      '  LEFT JOIN users ON users.id = comments.user ' +
      'WHERE site=? AND page=? AND deleted IS NULL ' +
      'ORDER BY comments.id',
    siteId, page
  )
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

/// @todo This shall be broken out into a subscription model
function getSubscribers(db, siteId, page) {
  var subscribers = [] ///< List of user objects.

  // Always add all site admins
  var adminsPromise = db.all(
    'SELECT users.* ' +
      'FROM siteadmins ' +
      '  LEFT JOIN users ON users.id = siteadmins.user ' +
      'WHERE siteadmins.site=? ',
    siteId
  )

  // Add everyone who commented on this page
  var commentersPromise = db.all(
    'SELECT users.* ' +
      'FROM comments ' +
      '  LEFT JOIN users ON users.id = comments.user ' +
      'WHERE site=? AND page=? AND deleted IS NULL ' +
      'GROUP BY comments.user',
    siteId, page
  )
}

function notifySubscribers(siteId, page) {
}


module.exports = CommentFactory
