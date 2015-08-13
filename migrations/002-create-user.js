exports.up = function (next) {
  this.createTable('user'{
    displayName: String,
    avatar:      String,
    email:       String,
  }, next)
}

exports.down = function (next) {
  this.dropTable('user')
}
