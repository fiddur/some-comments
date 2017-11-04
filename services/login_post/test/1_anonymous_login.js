'use strict'

const assert = require('assert')
const path = require('path')
const spawn = require('child_process').spawn
const fetch = require('node-fetch')

const target = process.env.TARGET
console.log(process.cwd(), target)
const targetDir = path.join(process.cwd(), target)

describe('POST /login: Anonymous logins', () => {
  let serverProcess
  let serverPid
  let baseUrl

  before(async () => {
    // console.log(`Starting ${target} in ${targetDir}: make start-test-service`)

    await new Promise(resolve => {
      serverProcess = spawn('make', ['start-test-service'], {
        cwd: targetDir, env: process.env
      })
      serverProcess.stdout.on('data', buffer => {
        const portRegex = /listening on port (\d+) in process (\d+)./g
        const portMatch = portRegex.exec(buffer.toString())
        if (portMatch) {
          baseUrl = `http://localhost:${portMatch[1]}`
          serverPid = portMatch[2]
          resolve()
        }
        else {
          console.log('Ignoring server output: ' + buffer)
        }
      })
      serverProcess.stderr.on('data', buffer => {
        console.log(`Server error: "${buffer}"`)
      })
      serverProcess.stdout.on('end', () => { throw new Error('Server died.') })
    })
  })

  after(() => {
    process.kill(serverPid, 'SIGKILL')
    serverProcess.kill('SIGKILL')
  })

  describe('when account iss is set to anonymous', () => {
    it('returns a json response with access_token', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body: { account: 'User Name@anonymous' },
      })
      const body = await response.json()
      assert('access_token' in body)
    })
  })
})
