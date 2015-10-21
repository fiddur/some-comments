/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren, Sören Jensen
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

//// TODO remove Q
var Q          = require('q')
var Handlebars = require('handlebars')
var FS         = require('fs')
var path       = require('path')
var markdown   = require('markdown').markdown

module.exports = function (app, model, config) {

  // Get by comment
  app.get('/sites/:site/pages/:page/reviews/', async(function(req, res) {

    var page = await(model.Page.getBySiteUrl(req.params.site, req.params.page))
console.log('--------------- app.get')

    if (page) {
console.log(await(page.getReviews()))

      res.json(await(page.getReviews()))
    }
    else {
      res.json([])
    }
  }))

  // Create new
  app.post('/sites/:site/pages/:page/reviews/', async(function(req, res) {
    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    if (typeof req.body.grade === 'undefined') {
      return res.status(400).send('Bad Request: grade is required')
    }

    var page = await(model.Page.getBySiteUrl(req.params.site, req.params.page))

    if (!page) {page = await(model.Page.create({siteId: req.params.site, url: req.params.page}))}

console.log('app.post', model)
    var review = await(model.Review.create({
      page: page,
      user: req.user,
      commentId: req.body.linkTo,
      grade: req.body.grade
    }))

    res.status(201).location(req.path + review.id).send(review)

  }))

  // Update existing
  app.put('/sites/:site/pages/:page/comments/:comment', async(function(req, res) {
    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    var comment = await(model.Comment.get(req.params.comment))
    var page    = await(model.Page.get(req.params.page))

    // Validate site and page
    if (page.siteId != req.params.site || comment.pageId != page.id) {return res.sendStatus(404)}

    // Validate user
    if (comment.userId !== req.user.id) {return res.sendStatus(401)}

    // Update comment
    try {
      await(comment.setText(req.body.text))
      res.json(comment)
    }
    catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  }))

}
