/**
 * User
 */
function User(id, displayName, avatar) {
  this.id          = id
  this.displayName = displayName
  this.avatar      = avatar
}
User.getById = function(id) {
  return global.app.locals.db
    .get('SELECT * FROM users WHERE id = ?', id)
    .then(function(userData) {
      if (typeof userData === 'undefined') {
        throw 'No user with id: ' + id
      }

      return new User(id, userData.displayName, userData.avatar)
    })
}
User.create = function(displayName, avatar) {
  console.log('Creating user: INSERT INTO users (displayName, avatar) VALUES(?,?)',
              displayName, avatar)

  return global.app.locals.db
    .run('INSERT INTO users (displayName, avatar) VALUES(?,?)', displayName, avatar)
    .then(function(db) {
      return new User(db.lastID, displayName, avatar)
    })
}
User.prototype.toString = function() {
  return this.displayName + ' (' + this.id + ')'
}

module.exports = User
