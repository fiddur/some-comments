exports.up = function (next) {
  this.execQuery(
    'CREATE UNIQUE INDEX IF NOT EXISTS system_uid ON accounts (system, uid)',
    [], next
  )
}

exports.down = function(next) {next()}
