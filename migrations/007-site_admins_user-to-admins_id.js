exports.up = function (next) {
  this.renameColumn('site_admins', 'user', 'user_id', next)
}

exports.down = function (next) {
  this.renameColumn('site_admins', 'user_id', 'user', next)
}
