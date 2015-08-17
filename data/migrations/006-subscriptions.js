
exports.up = function(next) {
  this.createTable('subscriptions', {
    pageId: {type: 'integer'},
    userId: {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('subscriptions', next)
}
