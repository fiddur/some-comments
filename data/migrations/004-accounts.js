
exports.up = function(next) {
  this.createTable('accounts', {
    id:            {type: 'serial', key: true},
    uid:           {type: 'text', unique: 'authenticator_uid'},
    authenticator: {type: 'text', unique: 'authenticator_uid'},
    user_id:       {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('accounts', next)
}
