exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS siteadmins ' +
      '(site INTEGER, user INTEGER)',
    [], next
  )
}

exports.down = function(next) {next()}
