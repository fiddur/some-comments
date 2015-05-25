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

var AccountFactoryPrototype = {}
function AccountFactory(db) {
  var af = Object.create(AccountFactoryPrototype)
  af.db = db
  af.UserFactory = require('./user.js')(db)
  return af
}

/**
 * Account - representing a login account at a connected service like Google, Facebook, Openid etc.
 *
 * - system  The authentication system - normally the passport strategy used.
 * - uid     The unique identifier on the connected system
 * - user    The User ID.
 */
AccountFactoryPrototype.getOrCreate = function(system, uid, data) {
  var self = this

  return this.db
    .get('SELECT * FROM accounts WHERE system = ? AND uid = ?', system, uid)
    .then(function(account_data) {
      if (typeof account_data === 'undefined') {

        console.log('There is no account.  Creating user and account.', system, uid)

        return self.UserFactory.create(data.displayName, data.avatar)
          .then(function(user) {
            console.log('Created user.  Now creating account.')
            return self.db.run(
              'INSERT INTO accounts (uid, system, user) VALUES (?,?,?)', uid, system, user.id
            )
          }).then(function(db) {
            console.log('Created account.  Authentication should be done.', user)
            return {id: db.lastID, uid: uid, system: system, user: user.id}
          })
      }
      else {
        return {id: account_data.id, uid: uid, system: system, user: account_data.user}
      }
    })
}

module.exports = AccountFactory
