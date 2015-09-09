
exports.up = function(next) {
  // This is kind of a permanent cache table, we don't need to transfer the data.
  this.dropTable('oidc_identifiers', next)
}

exports.down = function(next) {
  this.createTable('oidc_identifiers', {
    identifier: {type: 'text', unique: true},
    oidc:       {type: 'integer'},
  }, next)
}
