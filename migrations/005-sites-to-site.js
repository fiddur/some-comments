exports.up = function (next) {
  this.execQuery('ALTER TABLE sites RENAME TO site', [], next)
}

exports.down = function (next) {
  this.execQuery('ALTER TABLE site RENAME TO sites', [], next)
}
