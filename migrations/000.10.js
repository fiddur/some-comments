exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS oidc_identifiers (' +
      '  oidc       INTEGER,' +
      '  identifier STRING' +
      ')',
    [], next
  )
}

exports.down = function(next) {next()}
