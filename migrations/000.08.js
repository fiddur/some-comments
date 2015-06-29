exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS superadmins (user INTEGER)',
    [], next
  )
}

exports.down = function(next) {next()}
