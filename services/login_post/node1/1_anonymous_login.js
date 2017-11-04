const spawn = require('child_process').spawn

const target = process.env.TARGET
const targetDir = path.join(process.cwd(), target)

//const baseUrl =

describe('POST /login: Anonymous logins', () => {
  before(() => {
    console.log(`Starting ${target} in ${targetDir}, running "make start-test-service"`)

    await new Promise(resolve => {
      serverProcess = spawn('make', ['start-test-service'], {
        cwd: targetDir,
        env: subEnv
      })
      serverProcess.stdout.on('data', buffer => {
        // console.log('Server output: ' + buffer)

        const portRegex = /listening on port (\d+) in/g
        const portMatch = portRegex.exec(buffer.toString())
        if (portMatch) {
          baseUrl = `http://localhost:${portMatch[1]}/`
          resolve()
        }
      })
      serverProcess.stderr.on('data', buffer => { console.log(`Server error: "${buffer}`) })
      serverProcess.stdout.on('end', () => { throw new Error('Server died.') })
    })

  })

  describe('when account iss is set to anonymous', () => {
    it('creates a new user', () => {
    })
  })
})
