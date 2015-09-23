'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('siteadmins', function(table) {
    table.integer('site').references('site.id')
    table.integer('user').references('user.id')
    table.primary(['site', 'user'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('siteadmins')
}
