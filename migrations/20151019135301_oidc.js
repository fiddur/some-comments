'use strict'

exports.up = function(knex) {
  return knex.schema.createTable('oidc', function(table) {
    table.increments()
    table.string('issuer', 191).index()
    table.string('authorizationURL')
    table.string('tokenURL')
    table.string('userInfoURL')
    table.string('registrationURL')
    table.string('clientID')
    table.string('clientSecret')
    table.integer('expiresAt')

    table.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'))
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('oidc')
}
