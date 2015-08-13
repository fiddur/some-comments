exports.up = function (next) {
  this.execQuery(
    'CREATE UNIQUE INDEX IF NOT EXISTS domain ON sites (domain)',
    [], next
  )
}

exports.down = function(next) {next()}
