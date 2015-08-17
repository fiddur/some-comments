
exports.up = function (next) {
  this.addIndex('pagesubscription_idx', {
    table:   'subscriptions',
    columns: ['pageId', 'userId'],
    unique: true
  }, next);
};

exports.down = function (next) {
  this.dropIndex('pagesubscription_idx', 'subscriptions', next);
}
