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

module.exports = function (app, SiteFactory) {
  app.get('/sites/', function(req, res) {
    var db = req.app.locals.db

    console.log('Listing sites.')
    SiteFactory.getAll()
      .then(function(sites) {
        if (req.accepts('json', 'html') === 'json') {
          console.log('Rendering JSON')
          return res.json(sites)
        }

        console.log('Rendering HTML')
        res.render('sites/index', {sites: sites, server: config.server})
      }, function(error) {
        console.log('Error in site-list', error)
        throw error
      })
  })

  app.post('/sites/', function(req, res) {
    if (typeof req.body.domain === 'undefined') {
      return res.status(400).send('Bad Request: domain is required')
    }

    if (typeof req.user === 'undefined') {
      console.log('Unauthorized', req.headers.host, req.url)
      return res.status(401).send('Unauthorized')
    }

    SiteFactory.create(req.body.domain)
      .then(function(site) {
        site.addAdmin(req.user) // No need to wait for it to finish.
        res.status(201).location('/sites/' + site.id).send(site)
      }, function(error) {res.status(500).send(error)})
  })

  app.get('/sites/:site/pages/:page/comments/', function(req, res) {
    Comment.getAllByPage(req.params.site, req.params.page)
      .then(
        function(comments) {res.send(comments)},
        function(error)    {console.log(error); res.status(500).send(error)}
      )
  })

  app.post('/sites/:site/pages/:page/comments/', function(req, res) {
    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    Comment.add(req.params.site, req.params.page, req.user.id, req.body.text, null)
      .then(
        function(comment) {res.status(201).location(req.path + comment.id).send(comment)},
        function(error)   {res.status(500).send(error)}
      )
  })
}
