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
Comment.add = function(site, page, user, text, parent) {
  console.log('Adding a comment for ' + site + ' on ' + page + ' by ' + user + ': ' + text)

  return global.app.locals.db
    .run('INSERT INTO comments (text, user, site, page, parent) VALUES (?,?,?,?,?)',
         text, user, site, page, parent)
    .then(function(result) {
      return new Comment(result.lastID, text, user, page, parent, false)
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
