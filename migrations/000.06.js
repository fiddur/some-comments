exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS subscription (page STRING, user INTEGER)',
    [], next
  )
}

exports.down = function(next) {next()}
