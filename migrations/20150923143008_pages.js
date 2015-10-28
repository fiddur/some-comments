'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('pages', function(table) {
    table.increments()
    table.string('url', 191).unique().index()
    table.integer('siteId').references('site.id')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('modifiedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('sites')
}
