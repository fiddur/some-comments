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

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Model = require('objection').Model

module.exports = (models) => {
  function Account() {Model.apply(this, arguments)}
  Model.extend(Account)

  Account.tableName = 'accounts';

  Account.relationMappings = {
    user: {
      relation: Model.OneToOneRelation,
      modelClass: models.User,
      join: {
        from: 'accounts.userId',
        to:   'users.id',
      }
    }
  }

  /**
   * Find an account by authenticator and UID, or create it along with it's user.
   *
   * @param {string} authenticator
   * @param {string} uid
   * @param {object} userData   Object of userdata
   */
  Account.getOrCreate = async((authenticator, uid, userData) => {
    const account = await(
      Account.query()
        .where('authenticator', authenticator)
        .where('uid', uid)
        .eager('user')
        .limit(1)
    )

    if (account.length > 0) {return account[0]}

    // Create user first.
    const user = await(models.User.create(userData))

    return await(
      Account.query().insert({authenticator: authenticator, uid: uid, userId: user.id})
    ).$loadRelated('user')
  })


  /************************************************************************************************
   * Instance methods
   ************************************************************************************************/

  Account.prototype.getUser = function() {
    return await(this.$loadRelated('user')).user
  }

  return Account
}
