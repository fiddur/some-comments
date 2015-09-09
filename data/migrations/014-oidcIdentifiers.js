
exports.up = function(next) {
  this.createTable('oidcIdentifiers', {
    identifier: {type: 'text', unique: true, key: true},
    oidc_id:    {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('oidcIdentifiers', next)
}
