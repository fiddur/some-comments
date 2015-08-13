exports.up = function (next) {
  this.execQuery(
    'INSERT INTO users(id, displayName, avatar) ' +
      'SELECT id, displayName, avatar ' +
      'FROM tmp_table_name',
    [], next
  )
}

exports.down = function (next) {
  this.execQuery(
    'DELETE FROM user'
    [], next
  )
}
