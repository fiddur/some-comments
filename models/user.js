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

var crypto = require('crypto')

var jwt = require('jsonwebtoken')
var Q   = require('q')

module.exports = function(db, config) {
  var User = {}

  User.orm = db.qDefine('users', {
    id:          {type: 'serial', key: true},
    displayName: {type: 'text'},
    avatar:      {type: 'text'},
    email:       {type: 'text'},
    anonymousIp: {type: 'text', defaultValue: null},
  }, {
    methods: {
      /**
       * Get an unsubscribe token for a page
       *
       * @todo Make this async as well (for maximum performance).
       */
      unsubscribeToken: function (pageId) {
        return jwt.sign({page: pageId, user: this.id}, config.secret, {subject: 'unsubscribe'})
      },

      subscribe: function(page) {
        var self = this

        // Check if already subscribed.
        return Q.ninvoke(this, 'hasSubscriptions', page)
          .then(function(isSubscribed) {
            if (isSubscribed) {return true}
            return Q.ninvoke(self, 'addSubscriptions', page)
          })
      }
    }
  })

  User.get = function(id) {return User.orm.qGet(id)}

  User.create = function(data) {
    return User.orm.qCreate([data]).then(function(users) {return users[0]})
  }

  /**
   * Create an anonymous user from IP address.
   *
   */
  User.createAnonymous = function(ip) {
    if (!('anonymous' in config.authenticators)) {
      throw new Error('Anonymous users are not enabled in config.')
    }

    var userData = {
      anonymousIp: ip,
      displayName: config.authenticators.anonymous.displayName || 'Anonymous',
      avatar:      config.authenticators.anonymous.avatar || 'gravatar(monster)',
    }

    return User.create(userData)
      .then(function(user) {
        var gravatarMatches
        if (gravatarMatches = user.avatar.match(/^gravatar\((.*)\)$/)) {
          var hash = crypto.createHash('md5')
          hash.update(user.id + ': ' + user.anonymousIp)

          user.avatar =
            'https://www.gravatar.com/avatar/' + hash.digest('hex') + '?d=' + gravatarMatches[1]

          return user.save()
        }
        return user
      })
  }

  /**
   * @return Promise for [user, page]
   *
   * @exception Error  If token is not valid
   */
  User.unsubscribe = function(unsubscribeToken) {
    return Q.ninvoke(jwt, 'verify', unsubscribeToken, config.secret)
      .then(function(token) {
        if (token.sub !== 'unsubscribe') {throw new Error('Not an unsubscribe token')}
        return [User.get(token.user), config.model.Page.get(token.page)]
      }).spread(function(user, page) {
        return Q.ninvoke(page, 'removeSubscribers', user).then(function() {return [user, page]})
      })
  }

  return User
}
