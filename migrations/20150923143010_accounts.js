'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('accounts', function(table) {
    table.increments()

    table.string('uid',           191).unique()
    table.string('authenticator', 191).unique()
    table.index(['uid','authenticator'], 'authenticator_uid')

    table.integer('user')

    table.timestamp('createdAt')
    table.timestamp('modifiedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('accounts')
}
