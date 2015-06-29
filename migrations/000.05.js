exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS comments ' +
      '(id INTEGER PRIMARY KEY, text TEXT, user INTEGER, site INTEGER, ' +
      'page STRING, parent INTEGER, created DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
      'changed DATETIME, deleted DATETIME)',
    [], next
  )
}

exports.down = function(next) {next()}
