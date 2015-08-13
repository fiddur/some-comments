exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS sites ' +
      '(id INTEGER PRIMARY KEY, domain STRING, maxLevels INTEGER)',
    [], next
  )
}

exports.down = function(next) {next()}
