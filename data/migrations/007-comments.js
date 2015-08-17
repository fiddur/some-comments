
exports.up = function(next) {
  this.createTable('comments', {
    id:         {type: 'serial',  key:   true},
    text:       {type: 'text'},
    createdAt:  {type: 'date',    time:  true},
    modifiedAt: {type: 'date',    time:  true},
    deletedAt:  {type: 'date',    time:  true},
    user_id:    {type: 'integer', key:   true},
    page_id:    {type: 'integer', key:   true},
    parent_id:  {type: 'integer', index: true},
  }, next)
}

exports.down = function(next) {
  this.dropTable('comments', next)
}
