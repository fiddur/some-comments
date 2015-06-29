exports.up = function (next) {
  this.execQuery(
    'CREATE TABLE IF NOT EXISTS oidc (' +
      '  id               INTEGER PRIMARY KEY,' +
      '  issuer           STRING,' +
      '  authorizationURL STRING,' +
      '  tokenURL         STRING,' +
      '  userInfoURL      STRING,' +
      '  registrationURL  STRING,' +
      '  clientID         STRING,' +
      '  clientSecret     STRING,' +
      '  expiresAt        INTEGER' +
      ')',
    [], next
  )
}

exports.down = function(next) {next()}
