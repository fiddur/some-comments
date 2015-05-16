/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

(function(window) {
  /************************************************************************************************
   * A few simple utility helpers
   ************************************************************************************************/

  /**
   * Make a shortcut to document.getElementById…
   */
  var e = function (id) {return document.getElementById(id)}

  function ForbiddenError(req, call) {
    this.name = "Forbidden"
    this.call = call
    this.req  = req
    this.message = ''
  }
  ForbiddenError.prototype = Error.prototype

  /**
   * Minimal ajax wrapper with promises.
   */
  var ajax = {}
  ajax.call = function(method, url, headers, body) {
    var deferred = window.Q.defer()
    var req = new XMLHttpRequest()
    req.withCredentials = true
    req.open(method, url, true)

    for (var header in headers) {req.setRequestHeader(header, headers[header])}

    req.onload = function() {
      if (req.status >= 200 && req.status < 300) {return deferred.resolve(req.response)}
      if (req.status == 401) {
        deferred.reject(
          new ForbiddenError(req, {method: method, url: url, headers: headers, body: body})
        )
      }
      deferred.reject(req.statusText)
    }
    req.onerror = function() {deferred.reject("Network failure")}
    req.send(body)

    return deferred.promise
  }
  ajax.get = function(url) {
    return ajax.call('GET', url, {}, '')
  }
  ajax.post = function(url, data) {
    headers = {}
    headers['content-type'] = 'application/json'
    body = JSON.stringify(data)
    return ajax.call('POST', url, headers, body)
  }

  function Editor(input, preview) {
    this.update = function () {
      preview.innerHTML = markdown.toHTML(input.value)
    }
    input.editor = this
    this.update()
  }

  function parseUrl(url) {
    return document.createElement('a')
  }


  /************************************************************************************************
   * Some Comments
   ************************************************************************************************/

  var SomeCommentsPrototype = {}

  /**
   * Base class for Some Comments.
   *
   * @param server  string   Base URL, e.g. https://foo.bar/sc/
   * @param siteId  integer  Site ID
   */
  function SomeComments(server) {
    var sc = Object.create(SomeCommentsPrototype)
    sc.server = server
    return sc
  }

  SomeCommentsPrototype.displayByPage = function(siteId, pageId, elementId) {
    var element = e(elementId)
    var sc      = this
    var site    = Site(sc.server, siteId)

    Comment.getAllByPage(site, pageId)
      .then(function(comments) {
        for (var i = 0; i < comments.length; i++) {
          element.appendChild(Comment.getElement(comments[i]))
        }

        // Add input field
        var newCommentDiv = document.createElement('div')
        newCommentDiv.className = 'comment_row'
        user = {displayName: 'Foo Bar', avatar: 'nope'}
        newCommentDiv.innerHTML =
          '<div class="user">' +
          '  <img alt="' + user.displayName + '" src="' + user.avatar + '" />' +
          '</div>' +
          '<div class="comment_text">' +
          '  <textarea id="comment_' + pageId + '" placeholder="Comment…" ' +
          '            oninput="this.editor.update()">' +
          '  </textarea>' +
          '  <div class="comment_preview" id="preview_' + pageId + '"></div>' +
          '</div>'
        element.appendChild(newCommentDiv)

        var input = e('comment_' + pageId)
        input.addEventListener('keypress', function(kp) {
          if (kp.keyCode === 13 && !kp.ctrlKey && !kp.shiftKey) {
            console.log('POST')
            var commentText = input.value
            input.value = ''
            Comment.add(site, pageId, commentText)
              .then(function(comment) {
                element.insertBefore(Comment.getElement(comment), newCommentDiv)
              })
          }
        })

        new Editor(input, e('preview_' + pageId))
      })
  }

  SomeCommentsPrototype.getSites = function() {
    return ajax.get(this.server + '/sites/')
      .then(function(sitesJson) {
        return JSON.parse(sitesJson)
      })
  }

  ////////
  // User
  //
  var User = {}

  /**
   * Display a login iframe, promise to fulfil the original request.
   */
  User.offerLogin = function(site, call) {
    console.log('SomeComments: User is not logged in.  Offering login in iframe.')

    var iframe = document.createElement('iframe')
    iframe.src = site + 'login'
    iframe.className = 'login'

    var deferred = Q.defer()

    window.addEventListener("message", function(event) {
      var origUrl   = parseUrl(event.origin)
      var serverUrl = parseUrl(site.server)

      if (origUrl.hostname !== serverUrl.hostname) {
        console.log('Origin ' + origUrl.hostname + ' != ' + serverUrl.hostname + '.  Ignoring.')
        return
      }

      if (!event.data.authenticated) {return deferred.reject('Not authenticated')}

      // Resend ajax request.
      document.body.removeChild(iframe)
      ajax.call(call.method, call.url, call.headers, call.body).then(deferred.resolve)
    }, false);

    document.body.appendChild(iframe)

    console.log(iframe)

    return deferred.promise
  }

  ////////
  // Site
  //
  //var SitePrototype = {}

  function Site(server, siteId) {
    var site = {}//object.create(SitePrototype)

    site.id     = siteId
    site.server = server

    return site
  }

  Site.add = function(domain) {
    return ajax.post(
      baseUrl + '/sites/', {domain: domain})
      .then(
        function(response) {
          console.log('Added site', response)
        }, function(error) {
          console.log('Error', error)
        }
      )
  }


  ///////////
  // Comment
  //
  var Comment = {}

  /**
   * Get all the comments from one page
   *
   * @param site    object  A site object
   * @param pageId  string  The page ID
   */
  Comment.getAllByPage = function(site, pageId) {
    return ajax.get(site.server + 'sites/' + site.id + '/pages/' + pageId + '/comments/')
      .then(function(commentsJson) {
        return JSON.parse(commentsJson)
      })
  }

  /**
   * @param site    object  A site object
   * @param pageId  string  The page ID
   * @param text    string  Comment text
   */
  Comment.add = function(site, pageId, text) {
    return ajax.post(
      site.server + 'sites/' + site.id + '/pages/' + pageId + '/comments/', {text: text})
      .then(
        function(commentJson) {
          var comment = JSON.parse(commentJson)
          console.log('Added comment', comment)
          return comment
        }, function(error) {
          console.log('Got error', error)
          if (error instanceof ForbiddenError) {
            // Lets offer login and retry
            return User.offerLogin(site, error.call)
              .then(function (commentJson) {
                var comment = JSON.parse(commentJson)
                console.log('After auth: Added comment', comment)
                return comment
              })
          }
          console.log('Error', error)
        }
      )
  }

  Comment.getElement = function(comment) {
    var div = document.createElement('div')

    div.className = 'comment_row'
    div.innerHTML =
      '<div class="user"><img alt="' + comment.displayName + '" src="' + comment.avatar
      + '" /></div><div class="comment_text">'
      + markdown.toHTML('**' + comment.displayName + '**: ' + comment.text)
      + '<div class="created">' + comment.created + '</div></div>'

    return div
  }

  // Make some things available on window
  window.SomeComments = SomeComments
})(window)

// @license-end
