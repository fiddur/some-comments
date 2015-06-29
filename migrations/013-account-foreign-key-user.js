exports.up = function (next) {
  this.addForeignKey('account', {
    name:       'user_id',
    references: {table: 'user', column: 'id'}
  }, next)
}

exports.down = function (next) {
 this.dropForeignKey('account', 'user_id', next)
}
