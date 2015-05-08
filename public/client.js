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
  var baseUrl = 'http://localhost:1337'

  /**
   * Make a shortcut to document.getElementById…
   */
  var e = function (id) {return document.getElementById(id)}

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
        return User.offerLogin(method, url, headers, body)
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

  var User = {}
  /**
   * Display a login iframe, promise to fulfil the original request.
   */
  User.offerLogin = function(method, url, headers, body) {
    var iframe = document.createElement('iframe')
    iframe.src = "http://localhost:1337/login"
    iframe.className = 'login'

    var deferred = Q.defer()
    window.addEventListener("message", function(event) {
      if (event.origin !== baseUrl) {
        console.log('This does not originate from localhost:1337! Ignoring')
        return
      }

      if (!event.data.authenticated) {return deferred.reject('Not authenticated')}

      // Resend ajax request.
      document.body.removeChild(iframe)
      ajax.call(method, url, headers, body).then(deferred.resolve)
    }, false);

    document.body.appendChild(iframe)

    return deferred.promise
  }

  var Site = {}
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
  Site.list = function() {
    return ajax.get(baseUrl + '/sites/').then(function(sitesJson) {return JSON.parse(sitesJson)})
  }

  Site.list().then(
    function(sites) {e('sites').innerHTML = sites},
    function(error) {console.log('Error', error)}
  )

  var Comment = {}

  Comment.getAllByPage = function(site, page) {
    return ajax.get(baseUrl + '/sites/' + site + '/pages/' + page + '/comments/')
      .then(function(commentsJson) {
        return JSON.parse(commentsJson)
      })
  }

  Comment.add = function(site, page, text) {
    return ajax.post(
      baseUrl + '/sites/' + site + '/pages/' + page + '/comments/', {text: text})
      .then(
        function(comment) {
          console.log('Added comment', comment)
          return comment
        }, function(error) {
          console.log('Error', error)
        }
      )
  }

  /**
   * Displays all comments, and adds an input box for adding a comment.
   */
  Comment.displayAll = function(site, page, element) {
    Comment.getAllByPage(site, page)
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
          '  <textarea id="comment_123" placeholder="Comment…" oninput="this.editor.update()">' +
          '  </textarea>' +
          '  <div class="comment_preview" id="preview_123"></div>' +
          '</div>'
        element.appendChild(newCommentDiv)

        var input = e('comment_123')
        input.addEventListener('keypress', function(kp) {
          if (kp.keyCode === 13 && !kp.ctrlKey && !kp.shiftKey) {
            console.log('POST')
            Comment.add(site, page, input.value)
              .then(function(comment) {
                element.insertBefore(Comment.getElement(comment), newCommentDiv)
              })
          }
        })

        new Editor(input, e('preview_123'))
      })
  }

  function Editor(input, preview) {
    this.update = function () {
      preview.innerHTML = markdown.toHTML(input.value);
    };
    input.editor = this;
    this.update();
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
  window.Comment = Comment
  window.Site    = Site
  window.User    = User
  window.e       = e
})(window)

// @license-end
