/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

/* eslint-env browser */
/* global markdown */

/**
 * Dependencies:
 *
 *  * preact
 *  * markdown
 */

(window => {
  const { h, render } = window.preact

  const parseUrl = url => { const l = document.createElement('a'); l.href = url; return l }

  const uuid = a => (
    a ? (a ^ Math.random() * 16 >> a / 4).toString(16)
      : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
  )

  const renderDisplayNameSpan = ({ comment }) => h(
    'span', { class: 'commenter_name' }, comment.user.name || ''
  )

  const renderCommentDiv = ({ comment }) => h(
    'div', { class: 'comment' }, [
      renderDisplayNameSpan({ comment }),
      h('div', {
        class:                   'comment_text',
        dangerouslySetInnerHTML: { __html: markdown.toHTML(comment.text) },
      }),
      h('span', { class: 'comment_created' },
        comment.createdAt ? new Date(comment.createdAt).toString() : ''),
    ]
  )

  const renderPictureDiv = ({ user }) => h(
    'div', { class: `comment_picture ${user.picture ? '' : 'unknown_user'}` },
    user.picture ? h('img', { src: user.picture || '', alt: user.name || '' }) : '?'
  )

  const renderCommentRow = ({ comment }) => h(
    'div', { class: 'comment_row', id: `comment_${comment.id}` }, [
      renderPictureDiv({ user: comment.user }),
      renderCommentDiv({ comment }),
    ]
  )

  const renderCommentingDiv = ({ user, text, onInput, onSubmit }) => h(
    'div', { class: 'comment_row' }, [
      renderPictureDiv({ user }),
      h('div', { class: 'comment' }, [
        h('div', { class: 'comment_text comment_input' }, [
          h('textarea', {
            placeholder: 'Type your comment…',
            value:       text,
            onInput,
          }),
        ]),
        h('div', {
          class:                   'comment_text comment_preview',
          dangerouslySetInnerHTML: { __html: markdown.toHTML(text || '') },
        }),
        h('input', { type: 'submit', value: 'Submit', onClick: onSubmit }),
      ]),
    ]
  )

  const someCommentInfo = h(
    'div', { class: 'some_comment_info' }, h(
      'p', null, [
        h('a', { href: 'https://github.com/fiddur/some-comments' }, 'Some Comments'),
        ' ©Fredrik Liljegren 2020 ',
        h('a', { href: 'http://www.gnu.org/licenses/agpl-3.0.html' }, 'GNU AGPL-3.0'),
      ]
    )
  )

  const renderLogin = ({ server, authenticators }) => h('div', { class: 'login' }, [
    h('h1', null, 'Authenticate with…'),
    h('ul', { class: 'login_list' }, [
      ...authenticators.map(authenticator => h('li', null, h(
        'a', { href: `${server}/auth/${authenticator.id}`, target: '_blank' }, [
          h('img', {
            src:   authenticator.icon,
            class: 'authicon',
            alt:   authenticator.title,
          }),
          `${authenticator.title} ..`,
        ]
      ))),
    ]),
  ])

  const renderComments = ({
    server,
    state: { comments, newComment, user },
    commands: { attemptAddComment, updateNewComment },
  }) => {
    const rows = comments.map(comment => renderCommentRow({ comment, user }))

    rows.push(renderCommentingDiv({
      user,
      text:     newComment.text,
      onInput:  input => updateNewComment(input.target.value),
      onSubmit: () => attemptAddComment(newComment.text),
    }))

    const authenticators = [ // TODO: Fetch as metadata.
      {
        title: 'Google',
        id:    'google',
        icon:  'https://upload.wikimedia.org/wikipedia/commons/4/4d/Google_Icon.svg',
      },
    ]
    const loginBox = user.loginRequested ? renderLogin({ server, authenticators }) : ''

    return h('div', { class: 'some_comments' }, [
      h('div', { class: 'comments_container' }, rows),
      someCommentInfo, loginBox,
    ])
  }

  const putComment = ({ server, text, id, page }) => fetch(
    `${server}/pages/${page}/comments/${id}`, {
      body:        JSON.stringify({ text }),
      credentials: 'include',
      method:      'PUT',
      mode:        'cors',
      headers:     { 'content-type': 'application/json' },
    }
  )

  const Comments = server => page => {
    const store = {
      state: {
        comments:   [],
        user:       {},
        newComment: { text: '' },
      },
      listeners: new Set(),
      commands:  {
        attemptAddComment: async text => {
          try {
            const id = uuid() // create the comment id
            store.dispatch({ type: 'postingComment', data: { text, id, page } })

            if (!store.state.user || !store.state.user.name) {
              store.dispatch({ type: 'loginRequested' })
              await new Promise(resolve => {
                const waitForUser = newState => {
                  if (newState.user && newState.user.name) {
                    resolve()
                    store.removeListener(waitForUser)
                  }
                }
                store.addListener(waitForUser)
              })
            }

            const response = await putComment({ server, text, id, page })

            const comment = await response.json()
            store.dispatch({ type: 'commentPosted', data: { } })
            store.dispatch({ type: 'comment', data: comment })
          } catch (error) {
            store.dispatch({ type: 'postingCommentFailed', data: { error } })
          }
        },

        storeComment: comment => store.dispatch({ type: 'comment', data: comment }),

        updateNewComment: data => store.dispatch({ type: 'newCommentInput', data }),
      },

      apply: {
        comment: (state, comment) => ({ ...state, comments: [...state.comments, comment] }),

        newCommentInput: (state, text) => ({ ...state, newComment: { ...state.newComment, text } }),

        // postingComment
        // postingCommentFailed
        commentPosted: state => ({ ...state, newComment: { ...state.newComment, text: '' } }),

        loginRequested:         state => ({ ...state, user: { loginRequested: true } }),
        authenticationRejected: state => ({ ...state, user: {} }),
        userAuthenticated:      (state, { user }) => ({ ...state, user }),
      },

      dispatch({ type, data }) {
        if (type in store.apply) store.state = store.apply[type](store.state, data)
        store.listeners.forEach(listener => listener(store.state))
        console.log('new state', store.state)
      },

      addListener(listener) { store.listeners.add(listener) },

      removeListener(listener) { store.listeners.delete(listener) },
    }

    const get = async ({ onComment }) => {
      const comments = await (await window.fetch(`${server}/pages/${page}/comments`)).json()
      comments.forEach(onComment)
    }

    const mount = element => {
      get({ onComment: store.commands.storeComment })

      const previous = render(
        renderComments({ server, state: store.state, commands: store.commands }),
        element
      )

      store.addListener(
        newState => render(
          renderComments({ server, state: newState, commands: store.commands }), element, previous
        )
      )

      // Listen to message from authentication window.
      window.addEventListener('message', event => {
        const origUrl   = parseUrl(event.origin)
        const serverUrl = parseUrl(server)

        if (origUrl.hostname !== serverUrl.hostname) return
        if (!event.data.authenticated) {
          return void store.dispatch({ type: 'authenticationRejected' })
        }

        return void store.dispatch({ type: 'userAuthenticated', data: event.data.user })
      }, false)
    }

    return { mount }
  }

  const SomeComments = server => ({ comments: Comments(server) })

  window.SomeComments = SomeComments // eslint-disable-line no-param-reassign
})(window)

// @license-end
