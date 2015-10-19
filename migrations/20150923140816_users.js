'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments()
    table.string('displayName')
    table.string('avatar')
    table.string('email')
    table.string('anonymousIp')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('modifiedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('users')
}
