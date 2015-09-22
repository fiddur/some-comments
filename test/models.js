'use strict'

var crypto = require('crypto')

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var Q      = require('q')
var should = require('should')
var assert = require('assert')
var config = require('../config.js.test')
var models = require('../models/')

var config = {
  secret:         'verysecret',
  testMode:       true,
  baseUrl:        'http://localhost/',
  authenticators: {anonymous: {}},     // Using defaults.
  database:       {protocol: 'sqlite'} // In memory sqlite.
}

describe('Models', function() {
  var model, site, user, page, page2, comments = []

  before(async(function() {
    model = await(models(config, {}))

    // Setup some test data
    site = await(model.Site.create({domain: 'testdomain'}))

    page = page2 = await(model.Page.create({
      site: site,
      url:  'http://testdomain/myPage'
    }))

    user = await(model.User.create({displayName: 'Foo Bar'}))

    comments = await(model.Comment.createMulti([
      {
        text: 'This is a comment',
        user: user,
        page: page,
      },
      {
        text:    'This is too comment',
        user_id: user.id,
        page:    page,
      },
      {
        text:    'This is comment, ay?',
        user:    user,
        page_id: page.id,
      },
    ]))
  }))

  describe('Accounts', function() {
    it('should create a user when creating an account', async(function() {
      var account = await(model.Account.getOrCreate(
        'test', 'fubar', {displayName: 'Foo Bar', email: 'test@example.org'}
      ))

      assert.equal(account.uid, 'fubar')
      assert.equal(account.user.displayName, 'Foo Bar')
    }))
  })

  describe('Comments', function() {
    it('should list all comments from one page', async(function() {
      var pageComments = await(page.qGetComments())
      assert.equal(pageComments.length, 3)
    }))

    it('should create a comment', async(function() {
      var comment = await(model.Comment.create({
        text: 'Another one',
        user: user,
        page: page,
      }))

      assert.equal(comment.text, 'Another one')
    }))
  })

  describe('Pages', function() {
    it('should subscribe siteadmins to new pages', async(function() {
      var admin = await (model.User.create({
        displayName: 'Page Admin',
        email:       'foo@bar.com',
      }))

      var site = await (model.Site.create({domain: 'example.net'}))
      await (site.qAddAdmins([admin]))

      var page = await (model.Page.create({
        site: site,
        url:  'http://testdomain/myPage',
      }))

      var hasSubscription = await (Q.ninvoke(admin, 'hasSubscriptions', page))
      assert.ok(hasSubscription, 'Page admin should have a subscription.')
    }))
  })

  describe('Users', function() {
  //  it('should return user from valid unsubscribe token', function(done) {
  //  it('should throw error on invalid unsubscribe token', function(done) {

    it('should add subscription', async(function() {
      var user = await(model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
        email:       'foo@bar.com'
      }))

      await(user.subscribe(page))
      await(user.subscribe(page)) // Should do nothing

      // Make sure user is subscribed
      assert.ok(user.qHasSubscriptions(page), 'User should have a subscription.')
    }))

    it('should not add subscription without email', async(function() {
      var user = await(model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
      }))

      await(user.subscribe(page))

      // Make sure user is not subscribed
      //assert.ok(!await(user.qHasSubscriptions(page)), 'User should NOT have a subscription.')
      // …sometimes q-orm fails to define the q-methods…
      assert.ok(
        !await(Q.ninvoke(user, 'hasSubscriptions', page)),
        'User should NOT have a subscription.'
      )
    }))

    it('should give a working unsubscription token', async(function() {
      var user = await(model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
        email:       'foo@bar.com',
      }))

      await(user.subscribe(page))

      // Middle check: Make sure user is subscribed
      assert.ok(await(Q.ninvoke(user, 'hasSubscriptions', page)), 'User should have subscription.')

      // Get an unsubscribe token (normally sent by mail)
      var unsubscribeToken = user.unsubscribeToken(page.id)

      // Use the unsubscribe token!
      var unsubscribed = await(model.User.unsubscribe(unsubscribeToken))

      // Check that subscription is gone!
      assert.ok(
        !await(Q.ninvoke(unsubscribed[0], 'hasSubscriptions', unsubscribed[1])),
        'User should NOT be subscribed to page.'
      )
      assert.equal(unsubscribed[0].id, user.id, 'Unsubscription should have the right user.')
      assert.equal(unsubscribed[1].id, page.id, 'Unsubscription should have the right page.')
    }))

    it('should create an anonymous user with monster gravatars', async(function() {
      var user = await(model.User.createAnonymous('127.0.0.1'))

      var hash = crypto.createHash('md5')
      hash.update(user.id + ': 127.0.0.1')

      assert.equal(
        user.avatar,
        'https://www.gravatar.com/avatar/' + hash.digest('hex') + '?d=monsterid'
      )
    }))
  })
})
