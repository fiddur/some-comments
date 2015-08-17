
exports.up = function(next) {
  this.createTable('siteadmins', {
    site_id: {type: 'integer', unique: 'siteuser'},
    user_id: {type: 'integer', unique: 'siteuser'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('siteadmins', next)
}
