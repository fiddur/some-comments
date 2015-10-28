'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('oidcIdentifiers', function(table) {
    table.string('identifier', 191).index()
    table.string('oidcId').references('oidc.id')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('oidcIdentifiers')
}
