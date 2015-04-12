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
  /**
   * Make a shortcut to document.getElementById…
   */
  var e = function (id) {return document.getElementById(id)}

  /**
   * Minimal ajax wrapper with promises.
   */
  var ajax = {}
  ajax.call = function(method, url, headers, body) {
    var deferred = Q.defer()
    var req = new XMLHttpRequest()
    req.withCredentials = true
    req.open(method, url, true)

    for (var header in headers) {req.setRequestHeader(header, headers[header])}

    req.onload = function() {
      if (req.status == 200) {return deferred.resolve(req.response)}
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
      if (event.origin !== 'http://localhost:1337') {
        console.log('This does not originate from localhost:1337! Ignoring')
        return
      }

      if (!event.data.authenticated) {return deferred.reject('Not authenticated')}

      // Resend ajax request.
      document.body.removeChild(iframe)
      ajax.call(method, url, headers, body).then(deferred.resolve)
    }, false);

    document.body.appendChild(iframe)
    console.log(iframe.contentWindow)

    return deferred.promise
  }

  var Site = {}
  Site.add = function(domain) {
    return ajax.post(
      'http://localhost:1337/sites/', {domain: domain})
      .then(
        function(response) {
          console.log('Added site', response)
        }, function(error) {
          console.log('Error', error)
        }
      )
  }
  Site.list = function() {
    return ajax.get('http://localhost:1337/sites/')
      .then(function(sites_json) {
        console.log('in list')
        return JSON.parse(sites_json)
      })
  }

  Site.list().then(
    function(sites) {
      console.log("Number of sites", sites.length)
      e('sites').innerHTML = sites
    },
    function(error) {console.log('Error', error)}
  )


  var Comment = {}

  Comment.getAllByPage = function(site, page) {
    return ajax.get('http://localhost:1337/sites/' + site + '/pages/' + page + '/comments/')
      .then(function(commentsJson) {
        return JSON.parse(commentsJson)
      })
  }

  Comment.add = function(site, page, text) {
    return ajax.post(
      'http://localhost:1337/sites/' + site + '/pages/' + page + '/comments/', {text: text})
      .then(
        function(response) {
          console.log('Added comment', response)
        }, function(error) {
          console.log('Error', error)
        }
      )
  }

  Comment.displayAll = function(comments, element) {
    console.log(element, comments)
    for (var i = 0; i < comments.length; i++) {
      element.appendChild(Comment.getElement(comments[i]))
    }
  }

  Comment.getElement = function(comment) {
    var div = document.createElement('div')

    div.className = 'comment_row'
    div.innerHTML =
      '<div class="user"><img alt="' + comment.displayName + '" src="' + comment.avatar
      + '" /></div><div class="comment_text">'
      + markdown.toHTML('**' + comment.displayName + '**: ' + comment.text) + '</div>'
    console.log(div)


    return div
  }

  // Make some things available on window
  window.Comment = Comment
  window.Site    = Site
  window.User    = User
  window.e       = e
})(window)

// @license-end
