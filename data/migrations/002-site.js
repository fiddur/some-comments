
exports.up = function(next) {
  this.createTable('sites', {
    id:        {type: 'serial',  key:    true},
    domain:    {type: 'text',    unique: true},
    maxLevels: {type: 'integer', size:   2, defaultValue: 0},
  }, next)
}

exports.down = function(next) {
  this.dropTable('sites', next)
}
