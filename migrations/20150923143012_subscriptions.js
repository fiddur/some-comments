'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('subscriptions', function(table) {
    table.integer('user').references('user.id')
    table.integer('page').references('page.id')
    table.primary(['user', 'page'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('subscriptions')
}
