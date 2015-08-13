exports.up = function (next) {
  this.execQuery(
    'CREATE UNIQUE INDEX IF NOT EXISTS siteuser ON siteadmins (site, user)',
    [], next
  )
}

exports.down = function(next) {next()}
