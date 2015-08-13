exports.up = function (next) {
  console.log('Next is:', next)

  this.execQuery(
    'CREATE TABLE IF NOT EXISTS users ' +
      '(id INTEGER PRIMARY KEY, displayName STRING, avatar STRING)',
    [], next
  )
}

exports.down = function(next) {next()}
