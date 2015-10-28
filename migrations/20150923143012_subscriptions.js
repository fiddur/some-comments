'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('subscriptions', function(table) {
    table.integer('userId').references('user.id')
    table.integer('pageId').references('page.id')
    table.primary(['userId', 'pageId'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('subscriptions')
}
