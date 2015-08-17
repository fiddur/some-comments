
exports.up = function(next) {
  this.createTable('pages', {
    id:      {type: 'serial', key: true},
    url:     {type: 'text',   size: 255, unique: true},
    site_id: {type: 'integer'},
  }, next)
}

exports.down = function(next) {
  this.dropTable('pages', next)
}
