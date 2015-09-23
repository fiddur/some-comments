'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments()
    table.string('displayName')
    table.string('avatar')
    table.string('email')
    table.string('anonymousIp')

    table.timestamp('createdAt')
    table.timestamp('modifiedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('users')
}
