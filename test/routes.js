/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See
 * the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

'use strict'

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var should   = require('should')
var assert   = require('assert')
var request  = require('supertest')
var fs       = require('fs')
var url      = require('url')
var path     = require('path')
var spawn    = require('child_process').spawn
var Q        = require('q')
var rp       = require('request-promise')

var models = require('../models/')

var config = {
  secret:         'verysecret',
  testMode:       true,
  baseUrl:        'http://localhost/',
  authenticators: {anonymous: {}},     // Using defaults.
  database:       {protocol: 'sqlite'} // In memory sqlite.
}

describe('Routing Integration', function() {
  var serverProcess, baseUrl, agentLoggedIn, jarLoggedIn

  before(async(function() {
    this.timeout(5000)
    await(Q.Promise(function(resolve, reject, notify) {
      // Start the server
      var subEnv = process.env
      subEnv.COVERAGE = true
      serverProcess = spawn('node', ['index.js', 'config.js.test'], {env: subEnv})
      serverProcess.stdout.on('data', function (buffer) {
        //console.log('Server output: ' + buffer)

        var portRegex = /listening on port (\d+) in/g
        var portMatch = portRegex.exec(buffer.toString())
        if (portMatch) {
          baseUrl = 'http://localhost:' + portMatch[1] + '/'
          resolve()
        }
      })
      serverProcess.stderr.on('data', function (buffer) {console.log('Server error: "' + buffer)})
      serverProcess.stdout.on('end', function() {throw new Error('Server died.')})
    }))

    agentLoggedIn = request.agent(baseUrl)
    var authRes = await(Q.ninvoke(agentLoggedIn.get('auth/anonymous'), 'end'))
    agentLoggedIn.saveCookies(authRes)

    // Another jar for logged in (to use request-promise instead).
    jarLoggedIn = rp.jar()
    await(rp({uri: baseUrl + 'auth/anonymous', jar: jarLoggedIn}))
  }))

  after(function(done) {
    // Download the coverage
    var curlProcess = spawn(
      'curl', ['-o', path.resolve('build', 'coverage.zip'), baseUrl + 'coverage/download'],
      {cwd: __dirname}
    )
    curlProcess.stdout.on('end', function() {
      console.log('Coverage report saved in build/coverage.zip.')

      // Kill the server
      serverProcess.kill('SIGKILL')
      done()
    })
  })

  describe('Site access', function() {
    it('should list in JSON if preferred', function(done) {
      request(baseUrl)
        .get('sites/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done)
    })

    it('should list in HTML if preferred', function(done) {
      request(baseUrl)
        .get('sites/')
        .set('Accept', 'text/html,application/json')
        .expect('Content-Type', /html/)
        .expect(200, done)
    })

    it('should return not found status', function(done) {
      request(baseUrl)
        .get('sites/555')
        .set('Accept', 'application/json')
        .expect(404, done)
    })
  })

  describe('Anonymous user', function() {
    it('should see his name as Anonymous', async(function() {
      var meRes = await(Q.ninvoke(
        agentLoggedIn
          .get('users/me')
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/),
        'end'
      ))
      assert.equal(meRes.body.displayName, 'Anonymous')
    }))

    it('should be denied access to /users/X', function(done) {
      request(baseUrl)
        .get('users/9999')
        .expect(401, done)
    })
  })

  describe('Site creation', function() {
    it('should require domain', function(done) {
      request(baseUrl)
        .post('sites/')
        .send({})
        .expect(400, done)
    })

    it('should require auth', function(done) {
      request(baseUrl)
        .post('sites/')
        .send({domain: 'example.org'})
        .expect(401, done)
    })

    it('should add a site if authed', async(function() {
      var createRes = await(Q.ninvoke(
        agentLoggedIn.post('sites/').send({domain: 'example.org'}),
        'end'
      ))

      var sitesRegex = new RegExp('^' + baseUrl + 'sites/')
      assert(
        createRes.headers.location.match(sitesRegex),
        'Site location "' + createRes.headers.location + '"should match ' + sitesRegex
      )

      // Get the created site to confirm the domain.
      assert.equal(JSON.parse(await(rp(createRes.headers.location))).domain, 'example.org')
    }))
  })

  describe('Page comments', function() {
    var siteUrl

    before(async(function() {
      // Create site logged in with jarLoggedIn
      var response = await(rp({
        uri:    baseUrl + 'sites',
        jar:    jarLoggedIn,
        method: 'POST',
        json:   {domain: 'two.example.org'},
        resolveWithFullResponse: true
      }))

      siteUrl = response.headers.location
    }))

    it('POST should give comments with user info', async(function() {
      // Create another user for comment.
      var user2Jar = rp.jar()
      await(rp({uri: baseUrl + 'auth/anonymous', jar: user2Jar}))

      // Place comment
      var commentBody = await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/tpg') + '/comments/',
        method: 'POST',
        json: {text: 'My comment'},
        jar: user2Jar,
      }))

      assert.equal('My comment', commentBody.text)
      assert.equal('Anonymous', commentBody.user.displayName)
    }))

    it('GET should give comments with user info', async(function() {
      // Create another user for comment.
      var user2Jar = rp.jar()
      await(rp({uri: baseUrl + 'auth/anonymous', jar: user2Jar}))

      // Place comment
      var commentBody = await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/tpg2') + '/comments/',
        method: 'POST',
        json: {text: 'My comment'},
        jar: user2Jar,
      }))

      // Get comments from that page
      var commentBodies = JSON.parse(await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/tpg2') + '/comments/',
        method: 'GET',
      })))

      assert.equal('My comment', commentBodies[0].text)
      assert.equal('Anonymous', commentBodies[0].user.displayName)
    }))

    it('should give empty list of comments for unknown page', function(done) {
      request(baseUrl)
        .get('sites/9999/pages/' + encodeURIComponent('http://myother/testpage') +
             '/comments/')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          should.not.exist(err)
          assert.deepEqual(res.body, [])
          done()
        })
    })

    it('should require auth to add comment', async(function() {
      assert.throws(
        function() {await(rp({
          uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/') + '/comments/',
          method: 'POST',
          json: {text: 'My comment'},
          resolveWithFullResponse: true
        }))},
        function(err) {
          if (err.statusCode === 401) {return true}
          assert.fail(err.statusCode + ' !== 401')
        }
      )

    }))

    it('should allow modifying your own comments', async(function() {
      // Create a user for comment.
      var user2Jar = rp.jar()
      await(rp({uri: baseUrl + 'auth/anonymous', jar: user2Jar}))

      // Place comment
      var comment = await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/') + '/comments/',
        method: 'POST',
        json: {text: 'My comment'},
        jar: user2Jar,
      }))

      // Modify comment
      var comment2 = await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/') +
          '/comments/' + comment.id,
        method: 'PUT',
        json: {text: 'My ALTERED comment'},
        jar: user2Jar,
      }))

      assert.equal(comment2.text, 'My ALTERED comment')
    }))

    it('should disallow modifying others\' comments', async(function() {
      // Create a user for comment.
      var user2Jar = rp.jar()
      await(rp({uri: baseUrl + 'auth/anonymous', jar: user2Jar}))

      // Place comment
      var comment = await(rp({
        uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/') + '/comments/',
        method: 'POST',
        json: {text: 'My comment'},
        jar: user2Jar,
      }))

      // Modify comment (without cookie jar)
      assert.throws(
        function() {await(rp({
          uri: siteUrl + '/pages/' + encodeURIComponent('http://two.example.org/') +
            '/comments/' + comment.id,
          method: 'PUT',
          json: {text: 'My ALTERED comment'},
        }))},
        function(err) {
          if (err.statusCode === 401) {return true}
          assert.fail(err.statusCode + ' !== 401')
        }
      )
    }))
  })

/*  describe('Logged in user', function() {
    var user, agent

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
