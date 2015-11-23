'use strict'

exports.up = function(knex) {
  return knex.schema.table('sites', function(table) {
    table.json('settings', true).after('maxLevels')
  })
}

exports.down = function(knex) {
  return knex.schema.table('sites', function(table) {
    table.dropColumn('settings')
  })
}
