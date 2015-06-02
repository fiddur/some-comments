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

var Q = require('q')

module.exports = function (app, model) {
  app.get('/sites/:site/pages/:page/comments/', function(req, res) {
    model.Page.qOne({site: req.params.site, name: req.params.page})
      .done(function(page) {
        if (page) {page.qGetComments().then(function(comments) {res.json(comments)})}
        else {res.json([])}
      })
  })

  app.post('/sites/:site/pages/:page/comments/', function(req, res) {
    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    model.Page.qOne({site: req.params.site, name: req.params.page})
      .then(function(page) {
        if (page) {return page}
        else {
          return model.Page.qCreate([{site: req.params.site, name: req.params.page}])
            .then(function(pages) {return pages[0]})
        }
      })
      .then(function(page) {
        return model.Comment.qCreate([{
          site: req.params.site,
          page: page,
          user: req.user,
          text: req.body.text
        }])
      })
      .done(function(comments) {
        res.status(201).location(req.path + comments[0].id).send(comments[0])
      })
  })
}
