exports.up = function (next) {
  this.dropTable('user', next)
}

exports.down = function (next) {}
