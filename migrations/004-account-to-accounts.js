exports.up = function (next) {
  this.createTable('account'{
    uid:    {type: 'text', unique: 'system_uid'},
    system: {type: 'text', unique: 'system_uid'},
  }, next)
}

exports.down = function (next) {
  this.dropTable('account')
}
