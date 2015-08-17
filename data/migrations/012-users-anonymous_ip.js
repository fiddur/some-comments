
exports.up = function(next) {
  this.addColumn('users', {anonymousIp: {type: 'text', defaultValue: null}}, next)
}

exports.down = function(next) {
  this.dropColumn('users', 'anonymousIp', next)
}
