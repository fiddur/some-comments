'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('comments', function(table) {
    table.increments()
    table.string('text')

    table.integer('userId')
    table.integer('pageId')
    table.integer('parentId')

    table.timestamp('createdAt')
    table.timestamp('modifiedAt')
    table.timestamp('deletedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('comments')
}
