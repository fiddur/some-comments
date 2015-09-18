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

var Q          = require('q')
var Handlebars = require('handlebars')
var FS         = require('fs')
var path       = require('path')
var markdown   = require('markdown').markdown

module.exports = function (app, model, mailTransport, config) {
  app.get('/sites/:site/pages/:page/comments/', async(function(req, res) {
    var page = await(model.Page.getBySiteUrl(req.params.site, req.params.page))

    if (page) {
      res.json(await(page.qGetComments()))
    }
    else {
      res.json([])
    }
  }))

  app.post('/sites/:site/pages/:page/comments/', async(function(req, res) {
    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    var page = await(model.Page.getBySiteUrl(req.params.site, req.params.page))

    if (!page) {
      page = await(model.Page.create({site: req.params.site, url: req.params.page}))
    }

    var comment = await(model.Comment.create({
      page: page,
      user: req.user,
      text: req.body.text
    }))

    res.status(201).location(req.path + comment.id).send(comment)

    // Add subscription to this thread asynchronuously.
    if (req.user.anonymousIp !== null) {req.user.subscribe(page).done()}

    // Notify subscribers.
    notifySubscribers(comment).done()
  }))

  var notifySubscribers = async(function(comment) {
    var page        = await(comment.qGetPage())
    var subscribers = await(page.qGetSubscribers())
    var site        = await(page.qGetSite())

    var hbsRaw = await({
      txt: Q.nfcall(
        FS.readFile, path.join(__dirname, '..', 'views', 'email', 'notification.txt.hbs'),
        'utf-8'
      ),
      html: Q.nfcall(
        FS.readFile, path.join(__dirname, '..', 'views', 'email', 'notification.html.hbs'),
        'utf-8'
      )
    })
    var templates = {
      txt:  Handlebars.compile(hbsRaw.txt),
      html: Handlebars.compile(hbsRaw.html),
    }

    console.log(
      'All mails are now sent.',
      await(subscribers.map(function(user) {
        if (user.id === comment.user_id || !user.email) {
          return
        }

        var unsubscribeUrl =
            config.baseUrl + 'users/unsubscribe?jwt=' + user.unsubscribeToken(page.id)

        var mailTxt = templates.txt({
          commenter:       comment.user.displayName,
          commentMarkdown: comment.text,
          pageUrl:         page.url,
          unsubscribeUrl:  unsubscribeUrl
        })
        var mailHtml = templates.html({
          commenter:      comment.user.displayName,
          commentHtml:    markdown.toHTML(comment.text),
          pageUrl:        page.url,
          unsubscribeUrl: unsubscribeUrl
        })

        return Q.ninvoke(mailTransport, 'sendMail', {
          from:    config.email.address,
          to:      user.email,
          subject: 'New comment on: ' + page.url,
          text:    mailTxt,
          html:    mailHtml,
        })
      }))
    )
  })
}
