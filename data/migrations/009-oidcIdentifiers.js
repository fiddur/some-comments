
exports.up = function(next) {
  this.createTable('oidc_identifiers', {
    identifier: {type: 'text', unique: true},
    oidc:       {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('oidc_identifiers', next)
}
