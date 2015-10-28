'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('accounts', function(table) {
    table.increments()

    table.string('uid',           191)
    table.string('authenticator', 191)
    table.index(['uid', 'authenticator'], 'authenticatorUid')

    table.integer('userId')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('modifiedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('accounts')
}
