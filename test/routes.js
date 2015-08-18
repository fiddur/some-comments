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

var should   = require('should')
var assert   = require('assert')
var request  = require('supertest')
var config   = require('../config.js.test')
var fs       = require('fs')
var url      = require('url')
var path     = require('path')
var spawn    = require('child_process').spawn
var Q        = require('q')

var models = require('../models/')

describe('Routing Integration', function() {
  var serverProcess, baseUrl, model

  before(function(done) {
    this.timeout(15000) // Setting up things can take time if hd isn't quick

    var serverDeferred = Q.defer()

    models(config, {drop: true})
      .then(function(modelIn) {
        model = modelIn

        // Start the server
        var subEnv = process.env
        subEnv.COVERAGE = true
        serverProcess = spawn('node', ['index.js', 'config.js.test'], {env: subEnv})
        serverProcess.stdout.on('data', function (buffer) {
          //console.log('Server output: ' + buffer)

          var portRegex = /listening on port (\d+) in/g
          var portMatch = portRegex.exec(buffer.toString())
          if (portMatch) {
            baseUrl = 'http://localhost:' + portMatch[1]
            serverDeferred.resolve()
          }
        })
        serverProcess.stderr.on('data', function (buffer) {console.log('Server error: "' + buffer)})
        serverProcess.stdout.on('end', function() {throw new Error('Server died.')})
      })
      .done()

    // Wait until both the server and database are ready.
    serverDeferred.promise.done(done)
  })
  after(function(done) {
    // Download the coverage
    var curlProcess = spawn(
      'curl', ['-o', path.resolve('build', 'coverage.zip'), baseUrl + '/coverage/download'],
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
        .get('/sites/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done)
    })

    it('should list in HTML if preferred', function(done) {
      request(baseUrl)
        .get('/sites/')
        .set('Accept', 'text/html,application/json')
        .expect('Content-Type', /html/)
        .expect(200, done)
    })
  })

  describe('Site creation', function() {
    var agentLoggedIn, agentAnonymous

    before(function(done) {
      var agentLoggedInDeferred  = Q.defer()
      var agentAnonymousDeferred = Q.defer()

      // Create a user and login with an agent
      model.User.create({
        displayName: 'Test User 42',
        avatar: 'blah'
      }).then(function(user) {
        // Login
        var agent = request.agent(baseUrl)

        agent
          .get('/login/' + user.id)
          .end(function(err, res) {
            agent.saveCookies(res)
            agentLoggedInDeferred.resolve(agent)
          })
      }).then(function(foo) {
        // Create a an anonymous user and login with an agent
        return model.User.createAnonymous(
          '127.0.0.2'
        )
      }).then(function(user) {
        // Login
        var agent = request.agent(baseUrl)

        agent
          .get('/login/' + user.id)
          .end(function(err, res) {
            agent.saveCookies(res)
            agentAnonymousDeferred.resolve(agent)
          })
      }).done()

      Q.spread(
        [agentLoggedInDeferred.promise, agentAnonymousDeferred.promise],
        function(agentLoggedInIn, agentAnonymousIn) {
          agentLoggedIn  = agentLoggedInIn
          agentAnonymous = agentAnonymousIn
          done()
        }
      ).done()
    })

    it('should require auth', function(done) {
      request(baseUrl)
        .post('/sites/')
        .send({domain: 'example.org'})
        .expect(401, done)
    })

    it('should add a site if authed', function(done) {
      agentLoggedIn
        .post('/sites/')
        .send({domain: 'example.org'})
        .end(function(err, res) {
          assert.equal(err, null)

          model.Site.getByDomain('example.org')
            .then(
              function(site) {
                // Make sure the site is created.
                assert.ok(site)
                done()
              },
              function(err) {
                assert.fail(err)
                done()
              }).done()
        })
    })

    it('should NOT add a site if authed as anonymous', function(done) {
      agentAnonymous
        .post('/sites/')
        .send({domain: 'example.org'})
        .expect(401, done)
    })
  })

  describe('Page comments', function() {
    it('should give comments with user info', function(done) {
      this.timeout(5000) // Setting up things can take time if hd isn't quick
      // Setup site, page, user and comments
      var admin, site, comment

      model.User.create({displayName: 'Test User', avatar: 'http://my.avatar/jpg'})
        .then(function(adminIn) {
          admin = adminIn
          return model.Site.create({domain: 'mydomain'})
        })
        .then(function(siteIn) {
          site = siteIn
          return model.Page.create({site: site, url: 'http://mydomain/testpage'})
        })
        .then(function(page) {
          return model.Comment.create({page: page, user: admin, text: 'This is Some Comment.'})
        })
        .then(function(comments) {
          request(baseUrl)
            .get('/sites/' + site.id + '/pages/' + encodeURIComponent('http://mydomain/testpage') +
                 '/comments/')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
              should.not.exist(err)
              //res.body[0].id.should.equal(comments[0].id)
              //res.body[0].user.displayName.should.equal('Test User')
              done()
            })
        })
        .done()
    })

    it('should require auth to add comment', function(done) {
      model.Site.create({domain: 'my other domain'})
        .then(function(site) {
          request(baseUrl)
            .post('/sites/' + site.id + '/pages/testpage/comments/')
            .expect(401, done)
        })
        .done()
    })
  })

  describe('Anonymous user', function() {
    it('should be denied access to /users/X', function(done) {
      request(baseUrl)
        .get('/users/1')
        .expect(401, done)
    })
  })

  describe('Logged in user', function() {
    var user, agent

    before(function(done) {
      // Create a user and login with an agent
      model.User.create({displayName: 'Test User', avatar: 'http://my.avatar/jpg'})
        .then(function(userIn) {
          user = userIn

          // Login
          agent = request.agent(baseUrl)
          agent
            .get('/login/' + user.id)
            .end(function(err, res) {
              agent.saveCookies(res)
              done()
            })
        })
        .done()
    })

    it('should give user info in JSON if preferred', function(done) {
      agent
        .get('/users/' + user.id)
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

    //it('should add comment if user is logged in', function(done) {
    //  siteFactory.qCreate('mydomain')
    //    .then(function(site) {
    //      request(baseUrl)
    //        .post('/sites/' + site.id + '/pages/testpage/comments/')
    //        .expect(401, done)
    //    })
    //})
  })
})
