
exports.up = function(next) {
  this.createTable('oidc', {
    id:               {type: 'serial', key:    true},
    issuer:           {type: 'text',   unique: true},
    authorizationURL: {type: 'text'},
    tokenURL:         {type: 'text'},
    userInfoURL:      {type: 'text'},
    registrationURL:  {type: 'text'},
    clientID:         {type: 'text'},
    clientSecret:     {type: 'text'},
    expiresAt:        {type: 'integer', size: 8}
  }, next)
}

exports.down = function(next) {
  this.dropTable('oidc', next)
}
