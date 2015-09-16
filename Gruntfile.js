var orm           = require('orm')
var MigrationTask = require('migrate-orm2')


var config

runMigration = function (operation, grunt, done) {
  orm.settings.set('connection.debug', true)
  orm.connect(config.database, function (err, connection) {
    if (err) throw(err)

    console.log('Running on db:', config.database)
    var migrationTask = new MigrationTask(connection.driver, {dir: 'data/migrations'})
    migrationTask[operation](grunt.option('file'), done)
  })
}

module.exports = function(grunt) {

  if (grunt.option('config')) {
    config = require(grunt.option('config'))
  }
  else {
    config = require('./config.js')
  }

  grunt.registerTask('migrate:generate', '', function () {
    var done = this.async()
    runMigration('generate', grunt, done)
  })

  grunt.registerTask('migrate:up', '', function () {
    var done = this.async()
    runMigration('up', grunt, done)
  })

  grunt.registerTask('migrate:down', '', function () {
    var done = this.async()
    runMigration('down', grunt, done)
  })
}
