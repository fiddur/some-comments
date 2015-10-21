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

/**
 * This file contains all that is needed on the actual commenting page except two dependencies:
 *  * q.js
 *  * markdown.js
 *
 * Code design is meant to keep dependencies down to a minimum, and disregard deprecated browsers -
 * commenting is hardly a critical service.  When IE12 is rolled out we can skip Q and use native
 * promises…
 */

(function(window) {
  'use strict'

  /************************************************************************************************
   * A few simple utility helpers
   ************************************************************************************************/

  /**
   * Make a shortcut to document.getElementById…
   */
  var e = function (id) {return document.getElementById(id)}

  function ForbiddenError(req, call) {
    this.name = 'Forbidden'
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
    req.onerror = function() {deferred.reject('Network failure')}
    req.send(body)

    return deferred.promise
  }
  ajax.get = function(url) {
    return ajax.call('GET', url, {}, '')
  }
  ajax.del = function(url) {
    return ajax.call('DELETE', url, {}, '')
  }
  ajax.post = function(url, data) {
    var headers = {}
    headers['content-type'] = 'application/json'
    var body = JSON.stringify(data)
    return ajax.call('POST', url, headers, body)
  }
  ajax.put = function(url, data) {
    var headers = {}
    headers['content-type'] = 'application/json'
    var body = JSON.stringify(data)
    return ajax.call('PUT', url, headers, body)
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

  function makeCommentingDiv(user, postCb, preText) {
    var div = document.createElement('div')
    div.className = 'comment_row'

    div.appendChild(avatarDiv(user))

    // Instead of just showing the comment, make an input and a preview.

    var commentDiv = document.createElement('div')
    commentDiv.className = 'comment'

    // Review
    var reviewGrade = null // Not graded yet
    var reviewGradeLabelItems = {}

    var reviewDiv = document.createElement('div')
    reviewDiv.className = 'review review_editable'

    for (var i = 1; i <= 5; i++) {
      var gradeItem = document.createElement('input')
      var gradeItemLabel = document.createElement('label')
      gradeItem.name = 'review_grade'
      gradeItem.type = 'radio'
      gradeItem.value = i
      gradeItemLabel.innerHTML = '★'
      gradeItemLabel.appendChild(gradeItem)
      reviewGradeLabelItems[i] = gradeItemLabel;
      reviewDiv.appendChild(gradeItemLabel)
      gradeItem.addEventListener('click', function(cl) {
        reviewGrade = this.value
        for (var i = 1; i <= 5; i++) {
          reviewGradeLabelItems[i].className = i <= reviewGrade ? 'active' : ''
        }
      })
    }
    commentDiv.appendChild(reviewDiv)

    var inputDiv = document.createElement('div')
    inputDiv.className = 'comment_text'

    var input = document.createElement('textarea')
    input.placeholder = 'Type your comment and press enter…'
    inputDiv.appendChild(input)
    commentDiv.appendChild(inputDiv)
    if (preText) input.value = preText

    var commentPreview = document.createElement('div')
    commentPreview.className = 'comment_text'
    commentDiv.appendChild(commentPreview)

    input.addEventListener('input', function() {
      commentPreview.innerHTML = markdown.toHTML(this.value)
    })
    if (preText) {input.dispatchEvent(new Event('input'))}

    input.addEventListener('keypress', function(kp) {
      if (kp.keyCode === 13 && !kp.ctrlKey && !kp.shiftKey) {
        var commentText = input.value
        input.value = ''
        postCb(commentText, reviewGrade)
      }
    })

    div.appendChild(commentDiv)

    return div
  }

  function insertNewCommentElement(element, user, urlStr, grade) {
    var div = makeCommentingDiv(user, function(commentText, grade) {
      Comment.add(user.site, urlStr, commentText)
        .then(function(comment) {
console.log('insertNewCommentElement', comment);
          comment.site = user.site
          if (grade != null) {
            Review.add(user.site, urlStr, comment.id, grade)
              .then(function(review) {
                console.log('HEJ')
              })
              .done()
          }
          element.insertBefore(Comment.getElement(comment, user, review), div)

console.log(comment, grade);
          // Re-get the new comment div html, since user might have logged in.
          /// @todo Bind this to users/me instead.
          /////newCommentDiv.innerHTML = getNewCommentDivInnerHtml(comment.user)
        })
        .done()
    })

    element.appendChild(div)
  }

  SomeCommentsPrototype.displayByPage = function(siteId, url, elementId) {
    var element = e(elementId)
    var sc      = this
    var site    = Site(sc.server, siteId)
    var urlStr  = encodeURIComponent(url)

    window.Q.all([
      Comment.getAllByPage(site, urlStr),
      Review.getAllByPage(site, urlStr),
      User.get(sc.server, 'me')
    ])
      .spread(function(comments, reviews, user) {
        user.site = site
        user.review = null
        // Attach reviews to linked comment
        for (var i = 0; i < comments.length; i++) {
          comments[i].review = null
          for (var j = 0; j < reviews.length; j++) {
            if (reviews[j].userId == user.id) {
              user.review = reviews[j]
            }
            if (reviews[j].commentId === comments[i].id) {
              comments[i].review = reviews[j]
              break
            }
          }
          element.appendChild(Comment.getElement(comments[i], user))
        }
console.log(user.review)
        // Add field for new comment
        insertNewCommentElement(element, user, urlStr)

        var someCommentInfo = document.createElement('div')
        someCommentInfo.className = 'some_comment_info'
        someCommentInfo.innerHTML =
          '<p>' +
          '  <a href="https://github.com/fiddur/some-comments">Some Comments</a>' +
          '  ©Fredrik Liljegren' +
          '  <a href="http://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL-3.0</a>' +
          '</p>'
        element.appendChild(someCommentInfo)
      }).done()
  }

  SomeCommentsPrototype.getSites = function() {
    return ajax.get(this.server + 'sites/')
      .then(function(sitesJson) {
        return JSON.parse(sitesJson)
      })
  }
  SomeCommentsPrototype.addSite = function(domain) {
    var sc = this

    return ajax.post(
      sc.server + 'sites/', {domain: domain})
      .then(
        function(response) {
        }, function(error) {
          if (error instanceof ForbiddenError) {
            // Lets offer login and retry
            return User.offerLogin(sc.server, error.call)
              .then(function (siteJson) {
                console.log('Added site after auth?', siteJson)
              })
          }
          console.log('Error', error)
        }
      )
  }

  ////////
  // User
  //
  var User = {}

  /**
   * Display a login iframe, promise to fulfil the original request.
   */
  User.offerLogin = function(server, call) {
    var iframe = document.createElement('iframe')
    iframe.src = server + 'login'
    iframe.className = 'login'

    var deferred = Q.defer()

    window.addEventListener('message', function(event) {
      var origUrl   = parseUrl(event.origin)
      var serverUrl = parseUrl(server)

      if (origUrl.hostname !== serverUrl.hostname) {return }

      if (!event.data.authenticated) {return deferred.reject('Not authenticated')}

      // Resend ajax request.
      document.body.removeChild(iframe)
      ajax.call(call.method, call.url, call.headers, call.body).then(deferred.resolve).done()
    }, false);

    document.body.appendChild(iframe)

    return deferred.promise
  }

  User.get = function(server, id) {
    return ajax.get(server + 'users/' + id)
      .then(function(userJson) {
        return JSON.parse(userJson)
      }, function(error) {
        // Probably not logged in then…
        return {displayName: '?¿?¿?'}
      })
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

  ///////////
  // Comment
  //
  var Comment = {}

  /**
   * Get all the comments from one page
   *
   * @param site    object  A site object
   * @param urlStr  string  The page ID
   */
  Comment.getAllByPage = function(site, urlStr) {
    return ajax.get(
      site.server + 'sites/' + site.id + '/pages/' + urlStr + '/comments/'
    ).then(function(commentsJson) {
      var comments = JSON.parse(commentsJson)
      return comments.map(function(comment) {comment.site = site; return comment})
    })
  }

  /**
   * @param site    object  A site object
   * @param urlStr  string  The page ID
   * @param text    string  Comment text
   */
  Comment.add = function(site, urlStr, text) {
    return ajax.post(
      site.server + 'sites/' + site.id + '/pages/' + urlStr + '/comments/', {text: text})
      .then(
        function(commentJson) {
          var comment = JSON.parse(commentJson)
          return comment
        }, function(error) {
          if (error instanceof ForbiddenError) {
            // Lets offer login and retry
            return User.offerLogin(site.server, error.call)
              .then(function (commentJson) {
                var comment = JSON.parse(commentJson)
                return comment
              })
          }
          console.log('Error', error)
        }
      )
  }

  Comment.del = function(comment) {
    var commentUrl = comment.site.server + 'sites/' + comment.site.id + '/pages/' +
        comment.pageId + '/comments/' + comment.id

    ajax.del(commentUrl)
      .then(function() {
        var commentRow = e('comment_' + comment.id)
        commentRow.parentNode.removeChild(commentRow)
      }).done()
  }

  ///////////
  // Review
  //
  var Review = {}

  /**
   * @param site    object  A site object
   * @param urlStr  string  The page ID
   * @param grade   int     Review grade
   */
  Review.add = function(site, urlStr, commentId, grade) {
    return ajax.post(
      site.server + 'sites/' + site.id + '/pages/' + urlStr + '/reviews/', {grade: grade, linkTo: commentId})
      .then(
        function(reviewJson) {
          var review = JSON.parse(reviewJson)
          return review
        }, function(error) {
          if (error instanceof ForbiddenError) {
            // Lets offer login and retry
            return User.offerLogin(site.server, error.call)
              .then(function (reviewJson) {
                var review = JSON.parse(reviewJson)
                return review
              })
          }
          console.log('Error', error)
        }
      )
  }

  Review.getAllByPage = function(site, urlStr) {
    return ajax.get(
      site.server + 'sites/' + site.id + '/pages/' + urlStr + '/reviews/'
    ).then(function(reviewJson) {
      var reviews = JSON.parse(reviewJson)
      return reviews
    })
  }


  function avatarDiv(user) {
    var avatarDiv = document.createElement('div')
    avatarDiv.className = 'comment_avatar'

    if (user.avatar) {
      var avatarImg = document.createElement('img')
      avatarImg.src = user.avatar || ''
      avatarImg.alt = user.displayName || ''
      avatarDiv.appendChild(avatarImg)
    }
    else {
      var avatarTxt = document.createTextNode('?')
      avatarDiv.className = avatarDiv.className + ' unknown_user'
      avatarDiv.appendChild(avatarTxt)
    }

    return avatarDiv
  }

  function transformToEdit(comment) {
    var commentUrl = comment.site.server + 'sites/' + comment.site.id + '/pages/' +
        comment.pageId + '/comments/' + comment.id

    var row = e('comment_' + comment.id)
    var user = comment.user

    var oldCommentDiv = e('comment_' + comment.id)
    var commentingDiv = makeCommentingDiv(comment.user, function(commentText) {
      ajax.put(commentUrl, {text: commentText})
        .then(function(newCommentJson) {
          var newComment = JSON.parse(newCommentJson)
          newComment.user = user
          newComment.site = comment.site

          var newCommentDiv = Comment.getElement(newComment, user)
          commentingDiv.parentNode.insertBefore(newCommentDiv, commentingDiv)
          commentingDiv.parentNode.removeChild(commentingDiv)
        }).done()
    }, comment.text)

    oldCommentDiv.parentNode.insertBefore(commentingDiv, oldCommentDiv)
    oldCommentDiv.parentNode.removeChild(oldCommentDiv)
  }

  function editOptionsDiv(comment) {
    var editOptions = document.createElement('div')
    editOptions.className = 'edit_options'

    var editButton       = document.createElement('button')
    editButton.className = 'comment_edit'
    editButton.title     = 'Edit'
    editButton.appendChild(document.createTextNode('✎'))
    editButton.addEventListener('click', function() {transformToEdit(comment)})
    editOptions.appendChild(editButton)

    var deleteButton       = document.createElement('button')
    deleteButton.className = 'comment_delete'
    deleteButton.title     = 'Delete'
    deleteButton.addEventListener('click', function() {Comment.del(comment)})
    editOptions.appendChild(deleteButton)

    return editOptions
  }

  function commentDiv(comment, user) {
    var commentDiv = document.createElement('div')
    commentDiv.className = 'comment'

    if (user && comment.user.id === user.id) {
      commentDiv.appendChild(editOptionsDiv(comment))
    }

    commentDiv.appendChild(Renderer.user(comment))
    if (comment.review) commentDiv.appendChild(Renderer.review(comment.review))

    var commentText = document.createElement('div')
    commentText.className = 'comment_text'
    commentText.innerHTML = markdown.toHTML(comment.text)
    commentDiv.appendChild(commentText)

    var createdAtSpan = document.createElement('span')
    createdAtSpan.className = 'comment_created'
    createdAtSpan.appendChild(document.createTextNode(comment.createdAt || ''))
    commentDiv.appendChild(createdAtSpan)

    return commentDiv
  }

  ///////////
  // Renderer
  //
  var Renderer = {}

  Renderer.user = function(comment) {
    var userSpan = document.createElement('span')
    userSpan.className = 'commenter_name'
    userSpan.appendChild(document.createTextNode(comment.user.displayName || ''))
    return userSpan;
  }

  Renderer.review = function(review) {
    var reviewDiv = document.createElement('div')
    reviewDiv.className = 'review'
    for (var i = 1; i <= 5; i++) {
      reviewDiv.appendChild(Renderer.reviewGrade(review.grade >= i))
    }
    return reviewDiv;
  }

  Renderer.reviewGrade = function(active) {
    var gradeSpan = document.createElement('span')
    gradeSpan.innerHTML = '★'
    gradeSpan.className = active ? 'active' : ''
    return gradeSpan
  }

  Comment.getElement = function(comment, user, review) {
    var div = document.createElement('div')
    div.className = 'comment_row'
    div.id = 'comment_' + comment.id

    div.appendChild(avatarDiv(comment.user))
    div.appendChild(commentDiv(comment, user))

    return div
  }

  // Make some things available on window
  window.SomeComments = SomeComments
})(window)

// @license-end
