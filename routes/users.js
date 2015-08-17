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

var express = require('express')

module.exports = function(model, config) {
  var router = express.Router()

  router.get('/unsubscribe', function(req, res) {
    model.User.unsubscribe(req.query.jwt)
      .spread(function(user, page) {
        res.render('unsubscribe', {page: page, user: user})
      }).done()
  })

  router.get('/:id', function(req, res) {
    // Not logged in
    if (typeof req.user === 'undefined') {return res.sendStatus(401)}

    // Info about yourself
    if (req.params.id === 'me' || req.user.id === parseInt(req.params.id)) {
      return res.json(req.user)
    }

    /// @todo Check if superadmin
    if (req.user.id !== parseInt(req.params.id)) {return res.sendStatus(401)}

    // Specific user ID
    model.User.get(req.params.id)
      .then(function (user) {
        if (!user) {return res.sendStatus(404)}

        res.json(user)
      })
      .done()
  })

  return router
}
