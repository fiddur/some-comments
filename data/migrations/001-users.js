
exports.up = function(next) {
  this.createTable('users', {
    id:          {type: 'serial', key: true},
    displayName: {type: 'text'},
    avatar:      {type: 'text'},
    email:       {type: 'text'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('users', next)
}
