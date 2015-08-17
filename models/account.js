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

module.exports = function(db, User) {
  var Account = {}

  Account.orm = db.qDefine('accounts', {
    id:            {type: 'serial', key: true},
    uid:           {type: 'text', unique: 'authenticator_uid'},
    authenticator: {type: 'text', unique: 'authenticator_uid'},
  })
  Account.orm.qHasOne('user', User.orm, {autoFetch: true, key: true})

  /**
   * Find an account by authenticator and UID, or create it along with it's user.
   *
   * @param authenticator
   * @param uid
   * @param userData   Object of userdata
   */
  Account.getOrCreate = function(authenticator, uid, userData) {
    return Account.orm.qOne({authenticator: authenticator, uid: uid})
      .then(function(account) {
        if (account) {return account}

        // Create user first.
        var user

        return User.create(userData)
          .then(function(user) {
            return Account.orm.qCreate([{authenticator: authenticator, uid: uid, user: user}])
          })
          .then(function(accounts) {
            return accounts[0]
          })
      })
  }

  return Account
}
