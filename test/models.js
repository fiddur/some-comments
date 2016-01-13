'use strict'

var crypto = require('crypto')

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var should = require('should')
var assert = require('assert')
var config = require('../config.js.test')
var models = require('../models/')

var config = {
  secret:         'verysecret',
  testMode:       true,
  baseUrl:        'http://localhost/',
  authenticators: {anonymous: {}},     // Using defaults.
  database:       {
    //debug: true,
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    }
  }
}

describe('Models', function() {
  var model, site, user, page, page2, comments = [], review

  before(async(function() {
    model = await(models(config, {}))

    // Setup some test data
    site = await(model.Site.create(
      {domain: 'testdomain', settings: {useAvatar: true, sortOrder: 'desc'}}
    ))

    page = page2 = await(model.Page.create({
      site: site,
      // siteId: site.id, /// @todo Test creating page with siteId as well.
      url:  'http://testdomain/myPage'
    }))

    user = await(model.User.create({displayName: 'Foo Bar'}))

    comments = await([
      model.Comment.create({
        text: 'This is a comment',
        user: user,
        page: page,
      }),
      model.Comment.create({
        text: 'This is too comment',
        userId: user.id,
        page: page,
      }),
      model.Comment.create({
        text: 'This is comment, ay?',
        user: user,
        pageId: page.id,
      })
    ])

    review = await(
      model.Review.create({
        grade:     4,
        userId:    user.id,
        pageId:    page.id,
        commentId: comments[0].id,
      })
    )

  }))

  describe('Sites', function() {
    it('should get by domain', async(() => {
      let site2 = await(model.Site.getByDomain('testdomain'))
      assert.equal('testdomain', site2.domain)
    }))

    it('should get by origin', async(() => {
      let site2 = await(model.Site.getByOrigin('http://testdomain/foo'))
      assert.equal('testdomain', site2.domain)
    }))

    it('should update settings', async(() => {
      let site2 = await(model.Site.getByDomain('testdomain'))
      assert.equal(true, site2.settings.useAvatar)
      assert.equal('desc', site2.settings.sortOrder)
      await(model.Site.update(site2.id, {settings: {useAvatar: false, sortOrder: 'asc'}}))
      let site3 = await(model.Site.getByDomain('testdomain'))
      assert.equal(site2.id, site3.id)
      assert.equal(false, site3.settings.useAvatar)
      assert.equal('asc', site3.settings.sortOrder)
    }))

  })

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
      var pageComments = await(page.getComments())

      assert.equal(pageComments.length, 3)
      assert.equal(pageComments[0].text, 'This is a comment')
      assert.equal(pageComments[0].user.displayName, 'Foo Bar')
    }))

    it('should create a comment', async(function() {
      var comment = await(model.Comment.create({
        text: 'Another one',
        user: user,
        page: page,
      }))

      assert.equal(comment.text, 'Another one')
    }))

    it('should alter comment text', async(function() {
      var comment = await(model.Comment.create({
        text: 'One one one',
        user: user,
        page: page,
      }))

      assert.equal(comment.text, 'One one one')
      await(comment.setText('Else'))
      assert.equal(comment.text, 'Else')

      var comment2 = await(model.Comment.get(comment.id))
      assert.equal(comment2.text, 'Else')
    }))
  })

  describe('Reviews', function() {
    it('should list all reviews from one page', async(function() {
      var pageReviews = await(page.getReviews())
      assert.equal(pageReviews.length, 1)
      assert.equal(pageReviews[0].grade, 4)
      assert.equal(pageReviews[0].user.displayName, 'Foo Bar')
    }))

    it('should create a review', async(function() {
      var new_review = await(model.Review.create({
        grade: 2,
        user:  user,
        page:  page,
        comment: comments[1]
      }))

      assert.equal(new_review.grade, 2)
    }))

    it('should alter a review', async(function() {
      var new_review = await(model.Review.create({
        grade: 5,
        user:  user,
        page:  page,
        comment: comments[0]
      }))
      assert.equal(new_review.grade, 5)
      assert.equal(new_review.commentId, comments[0].id)

      await(new_review.update(1, comments[1].id))
      assert.equal(new_review.grade, 1)
      assert.equal(new_review.commentId, comments[1].id)

      var get_review = await(model.Review.get(new_review.id))
      assert.equal(new_review.grade, 1)
      assert.equal(new_review.commentId, comments[1].id)
    }))

    it('should find review by comment', async(function() {
      var found_review = await(model.Review.getByComment(comments[0].id))

      assert.equal(found_review.grade, 4)
      assert.equal(found_review.commentId, comments[0].id)
    }))

    it('should get page from review', async(function() {
      await(review.getPage())
      assert.equal(review.page[0].url, 'http://testdomain/myPage')
    }))

  })

  describe('Pages', function() {
    it('should subscribe siteadmins to new pages', async(function() {
      var admin = await (model.User.create({
        displayName: 'Page Admin',
        email:       'foo@bar.com',
      }))

      var site = await(model.Site.create({domain: 'example.net'}))
      await (site.addAdmin(admin))

      var page = await(model.Page.create({
        site: site,
        url:  'http://example.net/myPage',
      }))

      var hasSubscription = await(admin.hasSubscription(page))
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
      assert.ok(user.hasSubscription(page), 'User should have a subscription.')
    }))

    it('should not add subscription without email', async(function() {
      var user = await(model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
      }))

      await(user.subscribe(page))

      // Make sure user is not subscribed
      assert.ok(!await(user.hasSubscription(page)), 'User should NOT have a subscription.')
    }))

    it('should give a working unsubscription token', async(function() {
      var user = await(model.User.create({
        displayName: 'Test User',
        avatar:      'http://my.avatar/jpg',
        email:       'foo@bar.com',
      }))

      await(user.subscribe(page))

      // Middle check: Make sure user is subscribed
      assert.ok(await(user.hasSubscription(page)), 'User should have subscription.')

      // Get an unsubscribe token (normally sent by mail)
      var unsubscribeToken = user.unsubscribeToken(page.id)

      // Use the unsubscribe token!
      var unsubscribed = await(model.User.unsubscribe(unsubscribeToken))

      // Check that subscription is gone!
      assert.ok(
        !await(unsubscribed.user.hasSubscription(unsubscribed.page)),
        'User should NOT be subscribed to page.'
      )
      assert.equal(unsubscribed.user.id, user.id, 'Unsubscription should have the right user.')
      assert.equal(unsubscribed.page.id, page.id, 'Unsubscription should have the right page.')
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
