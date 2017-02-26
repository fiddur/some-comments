/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

/**
 * Dependencies:
 *
 *  * immutable
 *  * preact
 *  * markdown
 *
 * Code design is meant to keep dependencies down to a minimum, and disregard
 * deprecated browsers - commenting is hardly a critical service.
 */

(window => {
  const { h, render } = window.preact

  function ForbiddenError(req, call) {
    this.name    = 'Forbidden'
    this.call    = call
    this.req     = req
    this.message = ''
  }
  ForbiddenError.prototype = Error.prototype

  // Minimal ajax wrapper with promises.
  const ajax = {
    call: (method, url, headers, body) => new Promise((resolve, reject) => {
      const req = new XMLHttpRequest()
      req.withCredentials = true
      req.open(method, url, true)

      Object.keys(headers).forEach(
        header => req.setRequestHeader(header, headers[header])
      )

      req.onload = () => {
        if (req.status >= 200 && req.status < 300) return resolve(req.response)
        if (req.status === 401) {
          return reject(new ForbiddenError(req, { method, url, headers, body }))
        }
        return reject(req.statusText)
      }

      req.onerror = () => reject('Network failure')

      req.send(body)
    }),

    get: url => ajax.call('GET', url, {}, ''),

    del: url => ajax.call('DELETE', url, {}, ''),

    post: (url, data) => ajax.call(
      'POST', url, { 'content-type': 'application/json' }, JSON.stringify(data)
    ),

    put: (url, data) => ajax.call(
      'PUT', url, { 'content-type': 'application/json' }, JSON.stringify(data)
    ),
  }


  /** **************************************************************************/

  const renderDisplayNameSpan = comment => h(
    'span', { class: 'commenter_name' }, comment.user.displayName || ''
  )

  const renderCommentDiv = comment => h(
    'div', { class: 'comment' }, [
      renderDisplayNameSpan(comment),
      h('div', {
        class:                   'comment_text',
        dangerouslySetInnerHTML: { __html: markdown.toHTML(comment.text) },
      }),
      h('span', { class: 'comment_created' }, comment.createdAt || ''),
    ]
  )

  const renderAvatarDiv = user => h(
    'div', { class: `comment_avatar ${user.avatar ? '' : 'unknown_user'}` },
    user.avatar ? h('img', { src: user.avatar || '', alt: user.displayName || '' })
                : '?'
  )

  const renderCommentRow = (comment, user) => h(
    'div', { class: 'comment_row', id: `comment_${comment.id}` }, [
      renderAvatarDiv(comment.user),
      renderCommentDiv(comment, user),
    ]
  )

  const renderCommentingDiv = (user, text, onInput) => h(
    'div', { class: 'comment_row' }, [
      renderAvatarDiv(user),
      h('div', { class: 'comment' }, [ // commentDiv
        h('div', { class: 'comment_text comment_input' }, [
          h('textarea', {
            placeholder: 'Type your comment…',
            onInput,
          }), // input.value = preText
        ]),
        h('div', {
          class:                   'comment_text comment_preview',
          dangerouslySetInnerHTML: { __html: markdown.toHTML(text || '') },
        }),
      ]),
    ]

    // input.addEventListener('input', () => {
    //   commentPreview.innerHTML = markdown.toHTML(this.value)
    // })

    // input.addEventListener('keypress', kp => {
    //   if (kp.keyCode === 13 && !kp.ctrlKey && !kp.shiftKey) {
    //     const commentText = input.value
    //     input.value = ''
    //   }
    // })
  )


  /*
  SomeCommentsPrototype.getSites = function () {
    return ajax.get(`${this.server}sites/`)
      .then(sitesJson => JSON.parse(sitesJson))
  }
  SomeCommentsPrototype.addSite = function (domain, settings) {
    const sc = this

    return ajax.post(
      `${sc.server}sites/`, { domain, settings })
      .then(
        response => {
        }, error => {
          if (error instanceof ForbiddenError) {
            // Lets offer login and retry
            return User.offerLogin(sc.server, error.call)
              .then(siteJson => {
                console.log('Added site after auth?', siteJson)
              })
          }
          console.log('Error', error)
        }
      )
  }
  */

  /*
  let User = {}

  User.offerLogin = function (server, call) {
    const iframe = document.createElement('iframe')
    iframe.src = `${server}login`
    iframe.className = 'login'

    const deferred = window.Q.defer()

    window.addEventListener('message', event => {
      const origUrl   = parseUrl(event.origin)
      const serverUrl = parseUrl(server)

      if (origUrl.hostname !== serverUrl.hostname) { return }

      if (!event.data.authenticated) { return deferred.reject('Not authenticated') }

      // Resend ajax request.
      document.body.removeChild(iframe)
      ajax.call(call.method, call.url, call.headers, call.body).then(deferred.resolve).done()
    }, false)

    document.body.appendChild(iframe)

    return deferred.promise
  }

  User.get = function (server, id) {
    return ajax.get(`${server}users/${id}`)
      .then(userJson => JSON.parse(userJson), error =>
        // Probably not logged in then…
         ({ displayName: '?¿?¿?' }))
  }
  */

  /*
  Comment.del = function (comment) {
    const commentUrl = `${comment.site.server}sites/${comment.site.id}/pages/${
        comment.pageId}/comments/${comment.id}`

    ajax.del(commentUrl)
      .then(() => {
        const commentRow = e(`comment_${comment.id}`)
        commentRow.parentNode.removeChild(commentRow)
      }).done()
  }
  */

  /*
  function transformToEdit(comment, user) {
    const commentUrl = `${comment.site.server}sites/${comment.site.id}/pages/${
        comment.pageId}/comments/${comment.id}`

    if (user.id !== comment.userId) {
      console.log('Illegal edit')
      return
    }

    const oldCommentDiv = e(`comment_${comment.id}`)
    const commentingDiv = makeCommentingDiv(user, (commentText) => {
      ajax.put(commentUrl, { text: commentText })
        .then(newCommentJson => {
          const newComment = JSON.parse(newCommentJson)
          newComment.user = user
          newComment.site = comment.site

          const newCommentDiv = makeCommentDiv(newComment, user)
          commentingDiv.parentNode.insertBefore(newCommentDiv, commentingDiv)
          commentingDiv.parentNode.removeChild(commentingDiv)
        }).done()
    }, comment.text)

    oldCommentDiv.parentNode.insertBefore(commentingDiv, oldCommentDiv)
    oldCommentDiv.parentNode.removeChild(oldCommentDiv)
  }

  function editOptionsDiv(comment, user) {
    const editOptions = document.createElement('div')
    editOptions.className = 'edit_options'

    const editButton       = document.createElement('button')
    editButton.className = 'comment_edit'
    editButton.title     = 'Edit'
    editButton.appendChild(document.createTextNode('✎'))
    editButton.addEventListener('click', () => { transformToEdit(comment, user) })
    editOptions.appendChild(editButton)

    const deleteButton       = document.createElement('button')
    deleteButton.className = 'comment_delete'
    deleteButton.title     = 'Delete'
    deleteButton.addEventListener('click', () => { Comment.del(comment) })
    editOptions.appendChild(deleteButton)

    return editOptions
  }

  */

  const someCommentInfo = h(
    'div', { class: 'some_comment_info' }, h(
      'p', null, [
        h('a', { href: 'https://github.com/fiddur/some-comments' }, 'Some Comments'),
        ' ©Fredrik Liljegren ',
        h('a', { href: 'http://www.gnu.org/licenses/agpl-3.0.html' }, 'GNU AGPL-3.0'),
      ]
    )
  )

  const renderComments = ({ comments, newComment, user }, dispatch) => {
    console.log(comments)

    const rows = comments.map(comment => renderCommentRow(comment, user))

    rows.push(renderCommentingDiv(user, newComment.text, input => {
      console.log('got input', input.target.value)
      dispatch({ type: 'newCommentInput', data: input.target.value })
    }))

    return h('div', { class: 'some_comments' }, [
      h('div', { class: 'comments_container' }, rows),
      someCommentInfo,
    ])
  }

  // Representing the colleciton of comments on one page.
  const Comments = server => (site, page) => {
    const store = {
      state: Immutable.fromJS({
        comments:   [],
        user:       {},
        newComment: { text: 'fou' },
      }),
      listeners: Immutable.Set(),
      handlers:  {
        comment: (state, comment) => state
          .updateIn(['comments'], comments => comments.push(comment)),
        newCommentInput: (state, input) => state
          .setIn(['newComment', 'text'], input)
      },

      dispatch({ type, data }) {
        console.log('dispatch of', type, data)

        store.state = store.handlers[type](store.state, data)

        store.listeners.forEach(listener => listener(store.state))
      },

      addListener(listener) {
        store.listeners = store.listeners.add(listener)
      },
    }

    // Get all the comments from one page.
    const get = onComment => ajax.get(`${server}sites/${site}/pages/${page}/comments/`)
      .then(commentsJson => {
        JSON.parse(commentsJson).forEach(onComment)
      })

    // const add = text => ajax
    //   .post(`${server}sites/${site}/pages/${page}/comments/`, { text })
    //   .then(commentJson => JSON.parse(commentJson))
    //   .catch(error => {
    //     if (error instanceof ForbiddenError) {
    //       // Lets offer login and retry
    //       return User.offerLogin(site.server, error.call)
    //         .then(commentJson => {
    //           const comment = JSON.parse(commentJson)
    //           return comment
    //         })
    //     }
    //     console.log('Error', error)
    //   })

    // del: onDone => {
    // },

    // Mount the (auto-updating) commenting display on element
    const mount = element => {
      console.log('mounting on', element)

      // Fetch all comments.
      get(comment => store.dispatch({ type: 'comment', data: comment }))

      // Render onto given element.
      const previous = render(
        renderComments(store.state.toJS(), store.dispatch), element
      )

      // Re-render on updated state.
      store.addListener(
        newState => render(
          renderComments(newState.toJS(), store.dispatch), element, previous
        )
      )
    }

    return {
      get,
      mount,
    }
  }


  const SomeComments = server => ({
    comments: Comments(server),
  })


  window.SomeComments = SomeComments // eslint-disable-line no-param-reassign
})(window)

// @license-end
