/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

/* eslint-env browser */
/* global Immutable, markdown */

/**
 * Dependencies:
 *
 *  * immutable
 *  * preact
 *  * markdown
 */

(window => {
  const { h, render } = window.preact

  function uuid(a) {
    return a ? (a^Math.random() * 16 >> a / 4).toString(16)
      : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
  }

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

  const renderCommentingDiv = (user, text, onInput, onSubmit) => h(
    'div', { class: 'comment_row' }, [
      renderAvatarDiv(user),
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
        ' ©Fredrik Liljegren ',
        h('a', { href: 'http://www.gnu.org/licenses/agpl-3.0.html' }, 'GNU AGPL-3.0'),
      ]
    )
  )

  const renderLogin = ({ server, authenticators }) => h('div', { class: 'login' }, [
    h('h1', null, 'Comment as…'),
    h('ul', { class: 'login_list' }, [
      ...authenticators.map(authenticator => h('li', null, h(
        'a', { href: `${server}auth/${authenticator.id}`, target: '_blank' }, [
          h('img', {
            src:   authenticator.icon,
            class: 'authicon',
            alt:   authenticator.title,
          }),
          `${authenticator.title} ..`,
        ]
      ))),
      h('li', null, h('label', null, [
        'Anonymously as: ',
        h(
          'form', { onSubmit: async e => {
            e.preventDefault()
            console.log('submitted')
            const response = await fetch(`${server}login`, {
              body:        JSON.stringify({ account: 'a name@anonymous' }),
              credentials: 'include',
              headers:     { 'content-type': 'application/json' },
              method:      'POST',
              mode:        'cors',
            })
            console.log(response)
          } },
          h('input', { name: 'anonymous', placeholder: 'Display name' })
        ),
      ])),
    ]),
  ])

  const renderComments = (
    server, { comments, newComment, user }, { attemptAddComment, updateNewComment }
  ) => {
    console.log(comments)

    const rows = comments.map(comment => renderCommentRow(comment, user))

    rows.push(renderCommentingDiv(
      user, newComment.text,
      input => updateNewComment(input.target.value),
      () => attemptAddComment(newComment.text)
    ))

    const loginFrame = user.loginRequested
      ? h('iframe', { src: `${server}checkauth.html`, class: 'hidden' })
      : ''

    const authenticators = [ // ..get from.. 401?
      {
        title: 'Google',
        id:    'google',
        icon:  'https://upload.wikimedia.org/wikipedia/commons/4/4d/Google_Icon.svg',
      },
    ]
    const loginBox = user.loginRequested ? renderLogin({ server, authenticators }) : ''

    return h('div', { class: 'some_comments' }, [
      h('div', { class: 'comments_container' }, rows),
      someCommentInfo, loginFrame, loginBox,
    ])
  }

  const putComment = ({ server, body, id, page, site }) => fetch(
    `${server}sites/${site}/pages/${page}/comments/`,
    {
      body:        JSON.stringify({ body, id, page, site }),
      credentials: 'include',
      headers:     { 'content-type': 'application/json' },
      method:      'PUT',
      mode:        'cors',
    }
  )

  const Comments = server => (site, page) => {
    const store = {
      state: Immutable.fromJS({
        comments:   [],
        user:       {},
        newComment: { text: '' },
      }),
      listeners: Immutable.Set(),
      commands:  {
        // Takes state.newComment and sends it to server.
        attemptAddComment: async body => {
          try {
            const id = uuid() // create the comment id
            store.dispatch({ type: 'postingComment', data: { body, id, page, site } })
            const response = await putComment({ server, body, id, page, site })

            if (response.status === 401) {
              store.dispatch({ type: 'loginRequested' })
              await new Promise(resolve => {
                const waitForUser = newState => {
                  if (newState.toJS().user.displayName) {
                    resolve()
                    store.removeListener(waitForUser)
                  }
                }
                store.addListener(waitForUser)
              })
            }

            store.dispatch({ type: 'commentPosted', data: { response } })
          } catch (error) {
            store.dispatch({ type: 'postingCommentFailed', data: { error } })
          }
        },

        storeComment: comment => store.dispatch({ type: 'comment', data: comment }),

        updateNewComment: data => store.dispatch({ type: 'newCommentInput', data }),
      },

      apply: {
        comment: (state, comment) => state
          .updateIn(['comments'], comments => comments.push(comment)),

        newCommentInput: (state, input) => state
          .setIn(['newComment', 'text'], input),

        // postingComment
        // postingCommentFailed
        commentPosted: state => state.setIn(['newComment', 'text'], ''),

        loginRequested: state => state.setIn(['user', 'loginRequested'], true),
      },

      dispatch({ type, data }) {
        console.log('dispatch of', type, data)
        if (type in store.apply) store.state = store.apply[type](store.state, data)
        store.listeners.forEach(listener => listener(store.state))
      },

      addListener(listener) {
        store.listeners = store.listeners.add(listener)
        console.log(store.listeners)
      },

      removeListener(listener) {
        store.listeners = store.listeners.remove(listener)
        console.log(store.listeners)
      },
    }

    // Get all the comments from one page.
    const get = async onComment => {
      const comments = await (await window.fetch(`${server}sites/${site}/pages/${page}/comments/`)).json()
      comments.forEach(onComment)
    }

    // Mount the (auto-updating) commenting display on element
    const mount = element => {
      console.log('mounting on', element)

      // Fetch all comments.
      get(store.commands.storeComment)

      // Render onto given element.
      const previous = render(
        renderComments(server, store.state.toJS(), store.commands), element
      )

      // Re-render on updated state.
      store.addListener(
        newState => render(
          renderComments(server, newState.toJS(), store.commands), element, previous
        )
      )
    }

    return { mount }
  }

  const SomeComments = server => ({
    comments: Comments(server),
  })

  window.SomeComments = SomeComments // eslint-disable-line no-param-reassign
})(window)

// @license-end
