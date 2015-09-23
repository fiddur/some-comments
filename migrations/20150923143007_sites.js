'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('sites', function(table) {
    table.increments()
    table.string('domain', 191).unique().index()
    table.integer('maxLevels').defaultTo(0)

    table.timestamp('createdAt')
    table.timestamp('modifiedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('sites')
}
