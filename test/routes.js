/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */


const should   = require('should')
const assert   = require('assert')
const request  = require('supertest')
const path     = require('path')
const spawn    = require('child_process').spawn
const Q        = require('q')
const rp       = require('request-promise')

const config = {
  secret:         'verysecret',
  testMode:       true,
  baseUrl:        'http://localhost/',
  authenticators: { anonymous: {} },     // Using defaults.
  database:       { protocol: 'sqlite' }, // In memory sqlite.
}

describe('Routing Integration', () => {
  let serverProcess
  let baseUrl
  let agentLoggedIn
  let jarLoggedIn

  before(async () => {
    this.timeout(5000)
    await new Promise(resolve => {
      // Start the server
      const subEnv = process.env
      subEnv.COVERAGE = true
      serverProcess = spawn('node', ['index.js', 'config.js.test'], { env: subEnv })
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

    agentLoggedIn = request.agent(baseUrl)
    const authRes = await Q.ninvoke(agentLoggedIn.get('auth/anonymous'), 'end')
    agentLoggedIn.saveCookies(authRes)

    // Another jar for logged in (to use request-promise instead).
    jarLoggedIn = rp.jar()
    await rp({ uri: `${baseUrl}auth/anonymous`, jar: jarLoggedIn })
  })

  after(done => {
    // Download the coverage
    const curlProcess = spawn(
      'curl', ['-o', path.resolve('build', 'coverage.zip'), `${baseUrl}coverage/download`],
      { cwd: __dirname }
    )
    curlProcess.stdout.on('end', () => {
      console.log('Coverage report saved in build/coverage.zip.')

      // Kill the server
      serverProcess.kill('SIGKILL')
      done()
    })
  })

  describe('Site access', () => {
    it('should list in JSON if preferred', done => {
      request(baseUrl)
        .get('sites/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done)
    })

    it('should list in HTML if preferred', done => {
      request(baseUrl)
        .get('sites/')
        .set('Accept', 'text/html,application/json')
        .expect('Content-Type', /html/)
        .expect(200, done)
    })

    it('should return not found status', done => {
      request(baseUrl)
        .get('sites/555')
        .set('Accept', 'application/json')
        .expect(404, done)
    })
  })

  describe('Anonymous user', () => {
    it('should see his name as Anonymous', async () => {
      const meRes = await Q.ninvoke(
        agentLoggedIn
          .get('users/me')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/),
        'end'
      )
      assert.equal(meRes.body.displayName, 'Anonymous')
    })

    it('should be denied access to /users/X', done => {
      request(baseUrl)
        .get('users/9999')
        .expect(401, done)
    })
  })

  describe('Site creation', () => {
    it('should require domain', done => {
      request(baseUrl)
        .post('sites/')
        .send({})
        .expect(400, done)
    })

    it('should require auth', done => {
      request(baseUrl)
        .post('sites/')
        .send({ domain: 'example.org' })
        .expect(401, done)
    })

    it('should add a site if authed', async () => {
      const createRes = await Q.ninvoke(
        agentLoggedIn.post('sites/').send({ domain: 'example.org', settings: {} }),
        'end'
      )

      const sitesRegex = new RegExp(`^${config.baseUrl}sites/`)
      assert(
        createRes.headers.location.match(sitesRegex),
        `Site location "${createRes.headers.location}"should match ${sitesRegex}`
      )

      // Get the created site to confirm the domain.
      const response = await rp(
        createRes.headers.location.replace(config.baseUrl, baseUrl)
      )
      assert.equal(JSON.parse(response).domain, 'example.org')
    })
  })

  describe('Page comments', () => {
    let siteUrl

    before(async () => {
      // Create site logged in with jarLoggedIn
      const response = await rp({
        uri:                     `${baseUrl}sites`,
        jar:                     jarLoggedIn,
        method:                  'POST',
        json:                    { domain: 'two.example.org', settings: {} },
        resolveWithFullResponse: true,
      })

      siteUrl = response.headers.location.replace(config.baseUrl, baseUrl)
    })

    it('POST should give comments with user info', async () => {
      // Create another user for comment.
      const user2Jar = rp.jar()
      await rp({ uri: `${baseUrl}auth/anonymous`, jar: user2Jar })

      // Place comment
      const commentBody = await rp({
        uri:    `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/tpg')}/comments/`,
        method: 'POST',
        json:   { text: 'My comment' },
        jar:    user2Jar,
      })

      assert.equal('My comment', commentBody.text)
      assert.equal('Anonymous', commentBody.user.displayName)
    })

    it('GET should give comments with user info', async () => {
      // Create another user for comment.
      const user2Jar = rp.jar()
      await rp({ uri: `${baseUrl}auth/anonymous`, jar: user2Jar })

      // Place comment
      await rp({
        uri:    `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/tpg2')}/comments/`,
        method: 'POST',
        json:   { text: 'My comment' },
        jar:    user2Jar,
      })

      // Get comments from that page
      const commentBodies = JSON.parse(await rp({
        uri:    `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/tpg2')}/comments/`,
        method: 'GET',
      }))

      assert.equal('My comment', commentBodies[0].text)
      assert.equal('Anonymous', commentBodies[0].user.displayName)
    })

    it('should give empty list of comments for unknown page', done => {
      request(baseUrl)
        .get(`sites/9999/pages/${encodeURIComponent('http://myother/testpage')
             }/comments/`)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          should.not.exist(err)
          assert.deepEqual(res.body, [])
          done()
        })
    })

    it('should require auth to add comment', async () => {
      const response = await rp({
        uri:                     `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/')}/comments/`,
        method:                  'POST',
        json:                    { text: 'My comment' },
        resolveWithFullResponse: true,
        simple:                  false,
      })
      assert.equal(response.statusCode, 401)
    })

    it('should allow modifying your own comments', async () => {
      // Create a user for comment.
      const user2Jar = rp.jar()
      await rp({ uri: `${baseUrl}auth/anonymous`, jar: user2Jar })

      // Place comment
      const comment = await rp({
        uri:    `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/')}/comments/`,
        method: 'POST',
        json:   { text: 'My comment' },
        jar:    user2Jar,
      })

      // Modify comment
      const comment2 = await rp({
        uri: `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/')
          }/comments/${comment.id}`,
        method: 'PUT',
        json:   { text: 'My ALTERED comment' },
        jar:    user2Jar,
      })

      assert.equal(comment2.text, 'My ALTERED comment')
    })

    it('should disallow modifying others\' comments', async () => {
      // Create a user for comment.
      const user2Jar = rp.jar()
      await rp({ uri: `${baseUrl}auth/anonymous`, jar: user2Jar })

      // Place comment
      const comment = await rp({
        uri:    `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/')}/comments/`,
        method: 'POST',
        json:   { text: 'My comment' },
        jar:    user2Jar,
      })

      // Modify comment (without cookie jar)
      const response = await rp({
        uri: `${siteUrl}/pages/${encodeURIComponent('http://two.example.org/')
          }/comments/${comment.id}`,
        method: 'PUT',
        json:   { text: 'My ALTERED comment' },
        simple: false,
      })

      assert.equal(response.statusCode, 401)
    })
  })

/*  describe('Logged in user', function() {
    const user, agent

    before(function(done) {
      // Create a user and login with an agent
      model.User.create({displayName: 'Test User', avatar: 'http://my.avatar/jpg'})
        .then(function(userIn) {
          user = userIn

          // Login
          agent = request.agent(baseUrl)
          agent
            .get('login/' + user.id)
            .end(function(err, res) {
              agent.saveCookies(res)
              done()
            })
        })
        .done()
    })

    it('should give user info in JSON if preferred', function(done) {
      agent
        .get('users/' + user.id)
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err)

          res.body.displayName.should.equal('Test User')
          res.body.avatar.should.equal('http://my.avatar/jpg')
          should.not.exist(res.body.email)
          done()
        })
    })

    it('should give no user info for other users', function(done) {
      agent
        .get('users/9999')
        .set('Accept', 'application/json')
        .expect(401, done)
    })

    //it('should add comment if user is logged in', function(done) {
    //  siteFactory.qCreate('mydomain')
    //    .then(function(site) {
    //      request(baseUrl)
    //        .post('sites/' + site.id + '/pages/testpage/comments/')
    //        .expect(401, done)
    //    })
    //})
  })*/
})
