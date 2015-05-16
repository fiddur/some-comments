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

var User = require('./user.js')

/**
 * Account - representing a login account at a connected service like Google, Facebook, Openid etc.
 *
 * @param uid     The unique identifier on the connected system
 * @param system  The authentication system - normally the passport strategy used.
 * @param user    The User ID.
 */
function Account(id, uid, system, user) {
  this.id     = id
  this.uid    = uid
  this.system = system
  this.user   = user
}
Account.getOrCreate = function(system, uid, data) {
  return global.app.locals.db
    .get('SELECT * FROM accounts WHERE system = ? AND uid = ?', system, uid)
    .then(function(account_data) {
      if (typeof account_data === 'undefined') {

        console.log('There is no account.  Creating user and account.', system, uid)

        return User.create(data.displayName, data.avatar)
          .then(function(user) {
            console.log('Created user.  Now creating account.')
            return global.app.locals.db.run(
              'INSERT INTO accounts (uid, system, user) VALUES (?,?,?)', uid, system, user.id
            )
          }).then(function(db) {
            console.log('Created account.  Authentication should be done.')
            return new Account(db.lastID, uid, system, user.id)
          })
      }
      else {
        return new Account(account_data.id, uid, system, account_data.user)
      }
    })
}

module.exports = Account
