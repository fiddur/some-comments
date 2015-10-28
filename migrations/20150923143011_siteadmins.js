'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('siteadmins', function(table) {
    table.integer('siteId').references('site.id')
    table.integer('userId').references('user.id')
    table.primary(['siteId', 'userId'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('siteadmins')
}
