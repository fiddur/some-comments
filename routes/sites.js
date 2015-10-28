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

var async = require('asyncawait/async')
var await = require('asyncawait/await')

module.exports = function (app, model, config) {
  app.get('/sites/', async(function(req, res) {
    var sites = await(model.Site.all())

    if (req.accepts('json', 'html') === 'json') {
      return res.json(sites)
    }

    res.render('sites/index', {sites: sites, baseUrl: config.baseUrl})
  }))

  app.post('/sites/', async(function(req, res) {
    if (typeof req.body.domain === 'undefined') {
      return res.status(400).send('Bad Request: domain is required')
    }

    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    var site = await(model.Site.create({domain: req.body.domain}))

    await(site.addAdmin(req.user))

    res.status(201).location(config.baseUrl + 'sites/' + site.id).send(site)
  }))

  app.get('/sites/:id', async(function(req, res) {
    res.json(await(model.Site.get(req.params.id)))
  }))
}
