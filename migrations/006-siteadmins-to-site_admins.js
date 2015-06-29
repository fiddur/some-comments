exports.up = function (next) {
  this.execQuery('ALTER TABLE siteadmins RENAME TO site_admins', [], next)
}

exports.down = function (next) {
  this.execQuery('ALTER TABLE site_admins RENAME TO siteadmins', [], next)
}
