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
  var Account = db.qDefine('account', {
    uid:    {type: 'text', unique: 'system_uid'},
    system: {type: 'text', unique: 'system_uid'},
  })

  Account.qHasOne('user', User, {autoFetch: true, key: true})

  /**
   * Find an account by system and UID, or create it along with it's user.
   *
   * @param system
   * @param uid
   * @param userData   Object of userdata
   */
  Account.getOrCreate = function(system, uid, userData) {
    return Account.find({system: system, uid: uid}).qOne()
      .then(function(account) {
        if (account) {return account}

        // Create user first.
        var user

        return User.qCreate([userData])
          .then(function(users) {
            user = users[0]
            return Account.qCreate([{system: system, uid: uid, user: user}])
          })
          .then(function(accounts) {
            return accounts[0]
          })
      })
  }

  return Account
}
