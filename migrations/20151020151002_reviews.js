'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('reviews', function(table) {
    table.increments()
    table.integer('grade').notNullable()

    table.integer('userId').references('user.id')
    table.integer('pageId').references('page.id')
    table.integer('commentId').references('comment.id')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('modifiedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.timestamp('deletedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('reviews')
}
