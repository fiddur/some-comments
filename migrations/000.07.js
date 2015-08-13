exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS settings (key STRING, value STRING)',
    [], next
  )
}

exports.down = function(next) {next()}
