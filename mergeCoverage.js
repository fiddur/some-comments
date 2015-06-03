var fs        = require('fs')
var istanbul  = require('istanbul')
var collector = new istanbul.Collector()
var reporter  = new istanbul.Reporter(null, 'build')


collector.add(JSON.parse(fs.readFileSync('build/route-coverage.json', 'utf8')))
collector.add(JSON.parse(fs.readFileSync('build/coverage-final.json', 'utf8')))

reporter.addAll(['lcov', 'json']);

reporter.write(collector, true, function () {
  console.log('All reports generated');
})
