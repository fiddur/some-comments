/* eslint-env node, mocha */

const assert = require('assert')
const esClient = require('node-eventstore-client')
const path = require('path')
const fetch = require('node-fetch')
const uuid = require('uuid')
const jwt = require('jsonwebtoken')

const startTestService = require('../../../test/helpers/startTestService')

const target = process.env.TARGET
console.log(process.cwd(), target)
const targetDir = path.join(process.cwd(), target)

describe('POST /login: Anonymous logins', () => {
  let serverProcess
  let serverPid
  let baseUrl
  let es

  const accessTokenSecret = uuid.v4()

  before(async () => {
    // console.log(`Starting ${target} in ${targetDir}: make start-test-service`)

    [{ baseUrl, serverPid, serverProcess }] = await Promise.all([
      startTestService({ accessTokenSecret, targetDir }),

      new Promise(resolve => {
        // TODO: Add credentials.
        es = esClient.createConnection({}, process.env.ES_ENDPOINT)
        es.connect()
        es.once('connected', resolve)
      }),
    ])
  })

  after(() => {
    process.kill(serverPid, 'SIGKILL')
    serverProcess.kill('SIGKILL')
  })

  describe('when account iss is set to anonymous', () => {
    it('returns a json response with access_token', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body:   JSON.stringify({ account: 'User Name@anonymous' }),
      })
      const body = await response.json()
      assert.ok('access_token' in body)
    })

    it('has access_token with user', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body:   JSON.stringify({ account: 'User Name@anonymous' }),
      })
      const body = await response.json()
      const tokenData = jwt.decode(body.access_token)

      assert.notStrictEqual(tokenData, null, 'Token should be decoded to object')
      assert.ok('user' in tokenData)
      // assert.equal('aud', siteId)
      assert.deepEqual(tokenData.scope, ['comment'])
    })

    it('signs access_token with accessTokenSecret', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body:   JSON.stringify({ account: 'User Name@anonymous' }),
      })
      const body = await response.json()
      jwt.verify(body.access_token, accessTokenSecret)
    })

    it('sends created event on user uuid stream', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        body:   JSON.stringify({ account: 'User Name@anonymous' }),
      })
      const body = await response.json()
      const tokenData = jwt.decode(body.access_token)
      const userId = tokenData.user

      const slice = await es.readStreamEventsForward(
        userId, 0, 1, false
      )

      assert.equal(slice.events.length, 1, 'There should be one event for userId')

      const e = slice.events[0]
      assert.equal(e.event.eventType, 'UserAdded')

      const data = JSON.parse(e.event.data)
      assert.equal(data.user, userId)
      assert.equal(data.displayName, 'User Name')
    })
  })
})
