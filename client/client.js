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
 */

(window => {
  const { h, render } = window.preact

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

  const renderComments = ({ comments, newComment, user }, dispatch) => {
    console.log(comments)

    const rows = comments.map(comment => renderCommentRow(comment, user))

    rows.push(renderCommentingDiv(user, newComment.text, input => {
      dispatch({ type: 'newCommentInput', data: input.target.value })
    }, () => {
      console.log('POSTed...', newComment)
    }))

    return h('div', { class: 'some_comments' }, [
      h('div', { class: 'comments_container' }, rows),
      someCommentInfo,
    ])
  }

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
        attemptAddComment: () => {
          const text = store.state.getIn(['newComment', 'text'])
          store.dispatch({ type: 'postingComment' })
          ajax
            .post(`${server}sites/${site}/pages/${page}/comments/`, { text })
            .then(() => store.dispatch({ type: 'commentPosted' }))
            .catch(error => store.dispatch({
              type: 'postingCommentFailed', data: { error },
            }))
        },
      },

      apply: {
        comment: (state, comment) => state
          .updateIn(['comments'], comments => comments.push(comment)),

        newCommentInput: (state, input) => state
          .setIn(['newComment', 'text'], input),

        // postingComment
        // postingCommentFailed
        commentPosted: state => state
          .setIn(['newComment', 'text'], ''),
      },

      dispatch({ type, data }) {
        console.log('dispatch of', type, data)
        if (type in store.apply) store.state = store.apply[type](store.state, data)
        store.listeners.forEach(listener => listener(store.state))
      },

      addListener(listener) {
        store.listeners = store.listeners.add(listener)
      },
    }

    // Get all the comments from one page.
    const get = async onComment => {
      const commentsJson = await window.fetch(`${server}sites/${site}/pages/${page}/comments/`)
      JSON.parse(commentsJson)
        .forEach(onComment)
    }

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

    return { mount }
  }

  const SomeComments = server => ({
    comments: Comments(server),
  })

  window.SomeComments = SomeComments // eslint-disable-line no-param-reassign
})(window)

// @license-end
