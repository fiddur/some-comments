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

var Q          = require('q')
var Handlebars = require('handlebars')
var FS         = require('fs')
var path       = require('path')
var markdown   = require('markdown').markdown

module.exports = function (app, model, mailTransport, config) {
  app.get('/sites/:site/pages/:page/comments/', function(req, res) {
    model.Page.getBySiteUrl(req.params.site, req.params.page)
      .done(function(page) {
        if (page) {
          page.qGetComments().then(function(comments) {res.json(comments)})
        }
        else {
          res.json([])
        }
      })
  })

  app.post('/sites/:site/pages/:page/comments/', function(req, res) {
    var page

    if (typeof req.user === 'undefined') {return res.status(401).send('Unauthorized')}

    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    model.Page.getBySiteUrl(req.params.site, req.params.page)
      .then(function(pageIn) {
        if (pageIn) {return pageIn}
        else {
          return model.Page.create({site: req.params.site, url: req.params.page})
        }
      })
      .then(function(pageIn) {
        page = pageIn
        return model.Comment.create({
          page: page,
          user: req.user,
          text: req.body.text
        })
      })
      .done(function(comment) {
        res.status(201).location(req.path + comment.id).send(comment)

        // Add subscription to this thread asynchronuously.
        if (req.user.anonymousIp !== null) {req.user.subscribe(page).done()}

        // Notify subscribers.
        notifySubscribers(comment).done()
      })
  })

  function notifySubscribers(comment) {
    var page, mailTxtTemplate, mailHtmlTemplate, site, subscribers

    return comment.qGetPage()
      .then(function(pageIn) {
        page = pageIn
        return page.qGetSubscribers()
      })
      .then(function(subscribersIn) {
        subscribers = subscribersIn
        return page.qGetSite()
      })
      .then(function(siteIn) {
        site = siteIn

        return Q.all([
          Q.nfcall(
            FS.readFile, path.join(__dirname, '..', 'views', 'email', 'notification.txt.hbs'),
            'utf-8'
          ).then(function (mailTxtHbs) {
            mailTxtTemplate = Handlebars.compile(mailTxtHbs);
          }),
          Q.nfcall(
            FS.readFile, path.join(__dirname, '..', 'views', 'email', 'notification.html.hbs'),
            'utf-8'
          ).then(function (mailHtmlHbs) {
            mailHtmlTemplate = Handlebars.compile(mailHtmlHbs);
          })
        ])
      }).then(function() {
        var promises = []
        for (var i = 0; i < subscribers.length; i++) {
          var user = subscribers[i]

          if (user.id !== comment.user_id && user.email) {
            var unsubscribeUrl =
                config.baseUrl + 'users/unsubscribe?jwt=' + user.unsubscribeToken(page.id)

            var mailTxt = mailTxtTemplate({
              commenter:       comment.user.displayName,
              commentMarkdown: comment.text,
              pageUrl:         page.url,
              unsubscribeUrl:  unsubscribeUrl
            })
            var mailHtml = mailHtmlTemplate({
              commenter:      comment.user.displayName,
              commentHtml:    markdown.toHTML(comment.text),
              pageUrl:        page.url,
              unsubscribeUrl: unsubscribeUrl
            })

            promises.push(Q.ninvoke(mailTransport, 'sendMail', {
              from:    config.email.address,
              to:      user.email,
              subject: 'New comment on: ' + page.url,
              text:    mailTxt,
              html:    mailHtml,
            }))
          }
        }

        return Q.all(promises)
          .then(function(infos) {console.log('All mails are now sent.', infos)})
      })
  }
}
