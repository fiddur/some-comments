exports.up = function (next) {
  this.renameColumn('site_admins', 'site', 'site_id', next)
}

exports.down = function (next) {
  this.renameColumn('site_admins', 'site_id', 'site', next)
}
