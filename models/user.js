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

const crypto = require('crypto')

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Promise = require('bluebird')
const Model = require('objection').Model
const jwt   = require('jsonwebtoken')

module.exports = (models, config) => {
  function User() {Model.apply(this, arguments)}
  Model.extend(User)

  User.tableName = 'users'

  User.create = (data) => User.query().insert(data)

  User.get = async((id) => {
    const user = await(User.query().where('id', id).first())
    if (user === undefined) throw new Error('No User with ID ' + id)
    return user
  })

  /**
   * @return Promise for object with user and page
   *
   * @exception Error  If token is not valid
   */
  User.unsubscribe = async((unsubscribeToken) => {
    const token = await(Promise.promisify(jwt.verify)(unsubscribeToken, config.secret))

    if (token.sub !== 'unsubscribe') {
      throw new Error('Not an unsubscribe token')
    }

    const data = await({
      user: User.get(token.user),
      page: models.Page.get(token.page)
    })

    await(data.page.$relatedQuery('subscribers').unrelate(data.user.id))

    return data
  })

  /**
   * Create an anonymous user from IP address.
   *
   */
  User.createAnonymous = async((alias, ip) => {
    if (!('anonymous' in config.authenticators)) {
      throw new Error('Anonymous users are not enabled in config.')
    }

    const userData = {
      anonymousIp: ip,
      displayName: alias || config.authenticators.anonymous.displayName || 'Anonymous',
      avatar:      config.authenticators.anonymous.avatar || 'gravatar(monsterid)',
    }

    const user = await(User.create(userData))

    let gravatarMatches
    if (gravatarMatches = user.avatar.match(/^gravatar\((.*)\)$/)) {
      const hash = crypto.createHash('md5')
      hash.update(user.id + ': ' + user.anonymousIp)

      await(user.setAvatar(
        'https://www.gravatar.com/avatar/' + hash.digest('hex') + '?d=' + gravatarMatches[1]
      ))
    }

    return user
  })


  /************************************************************************************************
   * Instance methods
   ************************************************************************************************/

  /**
   * Get an unsubscribe token for a page
   *
   * @todo Make this async as well (for maximum performance).
   */
  User.prototype.unsubscribeToken = function(page) {
    const pageId = page instanceof models.Page ? page.id : page

    return jwt.sign({page: pageId, user: this.id}, config.secret, {subject: 'unsubscribe'})
  }

  User.prototype.hasSubscription = async(function(page) {
    const pages = await(this.$relatedQuery('subscriptions').where({pageId: page.id}))
    return pages.length > 0
  })

  User.prototype.subscribe = async(function(page) {
    // Don't subscribe if there's no e-mail address.
    if (!this.email) {return }

    try {
      await(this.$relatedQuery('subscriptions').relate(page.id))
    }
    catch (err) {
      // Ignore the UNIQUE contraint.
      if (!(/UNIQUE/.test(err))) {throw err}
    }
  })

  User.prototype.setAvatar = function(avatar) {
    this.avatar = avatar
    return this.$query().patch({avatar: avatar})
  }

  return User
}
