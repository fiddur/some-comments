exports.up = function (next) {
  this.addForeignKey('site_admins', {
    name:       'admins_id',
    references: {table: 'user', column: 'id'}
  }, next)
}

exports.down = function (next) {
 this.dropForeignKey('site_admins', 'admins_id', next)
}
