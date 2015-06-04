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
var jwt        = require('jsonwebtoken')

module.exports = function (app, model, mailTransport, config) {
  app.get('/sites/:site/pages/:page/comments/', function(req, res) {
    model.Page.qOne({site: req.params.site, url: req.params.page})
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

    model.Page.qOne({site: req.params.site, url: req.params.page})
      .then(function(page) {
        if (page) {return page}
        else {
          return model.Page.qCreate([{site: req.params.site, url: req.params.page}])
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
        var comment = comments[0]
        res.status(201).location(req.path + comment.id).send(comment)

        // Add subscription to this thread asynchronuously.
        comment.page.qAddSubscribers([req.user])
          .catch(function(error) {
            console.log(
              'Could not add subscription on page ' + page.id + ' for user ' + req.user.id,
              error
            )
          })

          // Notify subscribers.
          notifySubscribers(comment)
      })
  })

  function notifySubscribers(comment) {
    var page = comment.page
    var mailTxtTemplate, mailHtmlTemplate, site, subscribers

    return page.qGetSubscribers()
      .then(function(subscribersIn) {
        subscribers = subscribersIn
        console.log('About to notify subscribers of new comment:', comment, subscribers)

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
          if (subscribers[i].id === comment.user_id) {
            console.log('Wont send notification to commenter!')
          }
          else if (subscribers[i].email) {
            var unsubscribeUrl =
              config.host + '/users/unsubscribe?jwt=' + getUnsubscribeJwt(page, subscribers[i])

            var mailTxt = mailTxtTemplate({
              commentMarkdown: comment.text,
              pageUrl:         page.url,
              unsubscribeUrl:  unsubscribeUrl
            })
            var mailHtml = mailHtmlTemplate({
              commentHtml:    markdown.toHTML(comment.text),
              pageUrl:        page.url,
              unsubscribeUrl: unsubscribeUrl
            })

            console.log('Notification to: ', subscribers[i].email, mailTxt)

            promises.push(Q.ninvoke(mailTransport, 'sendMail', {
              from:    config.email.address,
              to:      subscribers[i].email,
              subject: 'New comment on: ' + page.url,
              text:    mailTxt,
              html:    mailHtml,
            }))
          }
          else {
            console.log('No email?', subscribers[i])
          }
        }

        return Q.all(promises)
          .then(function(infos) {console.log('All mails are now sent.', infos)})
      })
      .done()
  }

  function getUnsubscribeJwt(page, user) {
    return jwt.sign({page: page.id, user: user.id}, config.secret, {subject: 'unsubscribe'})
  }
}
