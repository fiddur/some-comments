'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('comments', function(table) {
    table.increments()
    table.string('text').notNullable()

    table.integer('userId')
    table.integer('pageId')
    table.integer('parentId')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('modifiedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('deletedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('comments')
}
