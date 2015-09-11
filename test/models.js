var crypto = require('crypto')

var Q      = require('q')
var should = require('should')
var assert = require('assert')
var config = require('../config.js.test')
var models = require('../models/')

//var config = {
//  database: {protocol: 'sqlite'} // In memory sqlite.
//}

describe('Models', function() {
  var model, site, page, comments = []

  before(function(done) {
    this.timeout(15000)

    models(config, {})
      .then(function(modelIn) {
        model = modelIn

        // Setup some test data
        return model.Site.create({domain: 'testdomain'})
      })
      .then(function(siteIn) {
        site = siteIn

        return model.Page.create({
          site: site,
          url:  'http://testdomain/myPage'
        })
      })
      .then(function(pageIn) {
        page = pageIn

        return model.User.create({displayName: 'Foo Bar'})
      })
      .then(function(user) {
        return model.Comment.createMulti([
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

  describe('Pages', function() {
    it('should subscribe siteadmins to new pages', function(done) {
      model.User
        .create({
          displayName: 'Page Admin',
          email:       'foo@bar.com',
        })
        .then(function(admin) {
          return [admin, model.Site.create({domain: 'example.net'})]
        })
        .spread(function(admin, site) {
          var qAdded = site.qAddAdmins([admin])//Q.ninvoke(site, 'addAdmins', [admin])
          return [admin, site, qAdded]
        })
        .spread(function(admin, site, added) {
          var pageQ = model.Page.create({
            site: site,
            url:  'http://testdomain/myPage',
          })
          return [admin, site, pageQ]
        })
        .spread(function(admin, site, page) {
          return Q.ninvoke(admin, 'hasSubscriptions', page)
        }).then(function(hasSubscription) {
          assert.ok(hasSubscription, 'Page admin should have a subscription.')
          done()
        }).done()
    })
  })

  describe('Users', function() {
  //  it('should produce a valid unsubscribe token', function(done) {
  //  it('should return user from valid unsubscribe token', function(done) {
  //  it('should throw error on invalid unsubscribe token', function(done) {

    it('should add subscription', function(done) {
      var user

      model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
        email:       'foo@bar.com'
      }).then(function(userIn) {
        user = userIn
        return user.subscribe(page)
      }).then(function(foo) {
        // Make sure user is subscribed
        return Q.ninvoke(user, 'hasSubscriptions', page)
      }).then(function(has) {
        assert.ok(has, 'User should have a subscription.')
        done()
      }).done()
    })

    it('should not add subscription without email', function(done) {
      var user

      model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
      }).then(function(userIn) {
        user = userIn
        return user.subscribe(page)
      }).then(function(foo) {
        // Make sure user is subscribed
        return Q.ninvoke(user, 'hasSubscriptions', page)
      }).then(function(isSubscribed) {
        assert.ok(!isSubscribed, 'User should have a subscription.')
        done()
      }).done()
    })

    it('should give a working unsubscription token', function(done) {
      model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
        email:       'foo@bar.com',
      }).then(function(user) {
        // Subscribe the user.
        return [user, user.subscribe(page)]
      }).spread(function(user, foo) {
        // Middle check: Make sure user is subscribed
        return [user, Q.ninvoke(user, 'hasSubscriptions', page)]
      }).spread(function(user, isSubscribed) {
        assert.ok(isSubscribed, 'User should have a subscription.')

        // Get an unsubscribe token (normally sent by mail)
        var unsubscribeToken = user.unsubscribeToken(page.id)

        // Use the unsubscribe token!
        return model.User.unsubscribe(unsubscribeToken)
      }).spread(function(user2, page2) {
        // Check that subscription is gone!
        return Q.ninvoke(user2, 'hasSubscriptions', page2)
      }).then(function(isSubscribed) {
        assert.ok(!isSubscribed, 'User should NOT be subscribed to page.')
        done()
      }).done()
    })

    it('should create an anonymous user with monster gravatars', function(done) {
      model.User.createAnonymous('127.0.0.1')
        .then(function(user) {
          var hash = crypto.createHash('md5')
          hash.update(user.id + ': 127.0.0.1')

          assert.equal(
            user.avatar,
            'https://www.gravatar.com/avatar/' + hash.digest('hex') + '?d=monsterid'
          )
          done()
        }).done()
    })
  })
})
