
exports.up = function(next) {
  this.createTable('superadmins', {
    user_id: {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('superadmins', next)
}
