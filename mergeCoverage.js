

const fs        = require('fs')
const istanbul  = require('istanbul')
const collector = new istanbul.Collector()
const reporter  = new istanbul.Reporter(null, 'build')

collector.add(JSON.parse(fs.readFileSync('build/route-coverage.json', 'utf8')))
collector.add(JSON.parse(fs.readFileSync('build/coverage-final.json', 'utf8')))

reporter.addAll(['lcov', 'json', ])

reporter.write(collector, true, () => console.log('All reports generated'))
