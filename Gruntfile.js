var async = require('asyncawait/async')
var await = require('asyncawait/await')

var Knex = require('knex')
var config

runMigration = async(function(done) {
  var knex = Knex(config.database)
  await(knex.migrate.latest())
  done()
})

module.exports = function(grunt) {

  if (grunt.option('config')) {
    config = require(grunt.option('config'))
  }
  else {
    config = require('./config.js')
  }

  grunt.registerTask('migrate', '', function () {
    var done = this.async()
    runMigration(done)
  })
}
