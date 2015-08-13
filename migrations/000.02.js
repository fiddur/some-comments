exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS accounts ' +
      '(id INTEGER PRIMARY KEY, uid STRING, system STRING, user INTEGER)',
    [], next
  )
}

exports.down = function(next) {next()}
