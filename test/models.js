var Q      = require('q')
var should = require('should')
var assert = require('assert')
var config = require('../config.js.test')
var models = require('../models/')

describe('Models', function() {
  var model, site, page, user, comments = []

  before(function(done) {
    this.timeout(15000)

    models({protocol: 'sqlite'}, {})
      .then(function(modelIn) {
        model = modelIn

        // Setup some test data
        return model.Site.qCreate([{domain: 'testdomain'}])
      })
      .then(function(sites) {
        site = sites[0]

        return model.Page.qCreate([{url:'http://testdomain/myPage'}])
      })
      .then(function(pages) {
        page = pages[0]

        return model.User.qCreate([{displayName: 'Foo Bar'}])
      })
      .then(function(users) {
        user = users[0]

        return model.Comment.qCreate([
          {
            text: 'This is a comment',
            user: user,
            page: page,
          },
          {
            text: 'This is too comment',
            user: user,
            page: page,
          },
          {
            text: 'This is comment, ay?',
            user: user,
            page: page,
          },
        ])
      })
      .then(function(commentsIn) {
        comments = commentsIn
      })
      .done(done)
  })

  describe('Accounts', function() {
    it('should create a user when creating an account', function(done) {
      model.Account.getOrCreate(
        'test', 'fubar', {displayName: 'Foo Bar', email: 'test@example.org'}
      ).then(function(account) {
        account.uid.should.equal('fubar')
        account.user.displayName.should.equal('Foo Bar')
        done()
      })
    })
  })

  describe('Comments', function() {
    it('should list all comments from one page', function(done) {
      Q.ninvoke(page, 'getComments')
        .then(function(pageComments) {
          pageComments.length.should.equal(3)
          done()
        })
    })
  })
})

