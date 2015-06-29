exports.up = function (next) {
  this.addForeignKey('site_admins', {
    name:       'site_id',
    references: {table: 'site', column: 'id'}
  }, next)
}

exports.down = function (next) {
 this.dropForeignKey('site_admins', 'site_id', next)
}
