'use strict'

const assert = require('assert')
const esClient = require('node-eventstore-client')
const path = require('path')
const spawn = require('child_process').spawn
const fetch = require('node-fetch')
const uuid = require('uuid')
const jwt = require('jsonwebtoken')

const target = process.env.TARGET
console.log(process.cwd(), target)
const targetDir = path.join(process.cwd(), target)

describe('POST /login: Anonymous logins', () => {
  let serverProcess
  let serverPid
  let baseUrl
  let es

  const USERS_STREAM = uuid.v4()
  const ACCESS_TOKEN_SECRET = uuid.v4()

  before(async () => {
    // console.log(`Starting ${target} in ${targetDir}: make start-test-service`)

    // TODO paralellise
    await new Promise(resolve => {
      // TODO: Add credentials.
      es = esClient.createConnection({}, process.env.ES_ENDPOINT)
      es.connect()
      es.once('connected', resolve)
    })

    await new Promise(resolve => {
      serverProcess = spawn('make', ['start-test-service'], {
        cwd: targetDir,
        env: {
          ACCESS_TOKEN_SECRET,
          USERS_STREAM,
          ...process.env,
        }
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
      assert.ok('access_token' in body)
    })

    it('has access_token with user', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body: { account: 'User Name@anonymous' },
      })
      const body = await response.json()
      const tokenData = jwt.decode(body.access_token)

      assert.notStrictEqual(tokenData, null, 'Token should be decoded to object')
      assert.ok('user' in tokenData)
      // assert.equal('aud', siteId)
      assert.equal('scope', ['comment'])
    })

    it('sends new user event to users_stream', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body: { account: 'User Name@anonymous' },
      })
      const body = await response.json()
      const tokenData = jwt.decode(body.access_token)
      const userId = tokenData.user

      const slice = await es.readStreamEventsForward(
        USERS_STREAM, 0, 100, false
      )
      assert.ok(
        slice.events.find(event => (
          event.data.user === userId && event.data.account === 'User Name@anonymous'
        )),
        `Missing event with ${userId} account: ${JSON.stringify(slice.events)}`
      )
    })

    it('sends created event on user uuid stream', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body: { account: 'User Name@anonymous' },
      })
      const body = await response.json()
      const tokenData = jwt.decode(body.access_token)
      const userId = tokenData.user

      const slice = await es.readStreamEventsForward(
        userId, 0, 1, false
      )

      assert.equal(slice.events.length, 1, 'There should be one event for userId')

      const event = slice.events[0]
      assert.equal(event.eventType, 'new_user')
      assert.equal(event.data.user, userId)
      assert.equal(event.data.displayName, 'User Name')
    })
  })
})
