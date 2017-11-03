const aasync = require('asyncawait/async')
const aawait = require('asyncawait/await')

const Promise    = require('bluebird')
const Handlebars = require('handlebars')
const readFile   = Promise.promisify(require('fs').readFile)
const FS         = require('fs')
const path       = require('path')
const markdown   = require('markdown').markdown

module.exports = function (app, model, mailTransport, config) {
  app.get('/sites/:site/pages/:page/comments/', aasync((req, res) => {
    const page = aawait(model.Page.getBySiteUrl(req.params.site, req.params.page))

    if (page) {
      res.json(aawait(page.getComments()))
    }    else {
      res.json([])
    }
  }))

  app.post('/sites/:site/pages/:page/comments/', aasync((req, res) => {
    if (typeof req.user === 'undefined') { return res.status(401).send('Unauthorized') }

    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    let page = aawait(model.Page.getBySiteUrl(req.params.site, req.params.page))

    if (!page) { page = aawait(model.Page.create({ siteId: req.params.site, url: req.params.page })) }

    const comment = aawait(model.Comment.create({
      page,
      user: req.user,
      text: req.body.text,
    }))

    res.status(201).location(req.path + comment.id).send(comment)

    // Add subscription to this thread aasynchronuously.
    if (req.user.anonymousIp !== null) { req.user.subscribe(page).done() }

    // Notify subscribers.
    notifySubscribers(comment).done()
  }))

  app.put('/sites/:site/pages/:page/comments/:comment', aasync((req, res) => {
    if (typeof req.body.text === 'undefined') {
      return res.status(400).send('Bad Request: text is required')
    }

    if (typeof req.user === 'undefined') { return res.status(401).send('Unauthorized') }

    const comment = aawait(model.Comment.get(req.params.comment))
    const page    = aawait(model.Page.get(req.params.page))

    // Validate site and page
    if (page.siteId != req.params.site || comment.pageId != page.id) { return res.sendStatus(404) }

    // Validate user
    if (comment.userId !== req.user.id) { return res.sendStatus(401) }

    // Update comment
    try {
      aawait(comment.setText(req.body.text))
      res.json(comment)
    }    catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  }))

  app.delete('/sites/:site/pages/:page/comments/:comment', aasync((req, res) => {
    if (typeof req.user === 'undefined') { return res.status(401).send('Unauthorized') }

    const comment = aawait(model.Comment.get(req.params.comment))
    const page    = aawait(model.Page.get(req.params.page))

    // Validate site and page
    if (page.siteId != req.params.site || comment.pageId != page.id) { return res.sendStatus(404) }

    // Validate user
    if (comment.userId !== req.user.id) { return res.sendStatus(401) }

    // Delete comment
    try {
      aawait(comment.del())
      res.sendStatus(204)
    }    catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  }))

  const notifySubscribers = aasync(comment => {
    const page        = aawait(comment.getPage())
    const subscribers = aawait(page.getSubscribers())
    const site        = aawait(page.getSite())

    const hbsRaw = aawait({
      txt:  readFile(path.join(__dirname, '..', 'views', 'email', 'notification.txt.hbs'), 'utf-8'),
      html: readFile(path.join(__dirname, '..', 'views', 'email', 'notification.html.hbs'), 'utf-8'),
    })
    const templates = {
      txt:  Handlebars.compile(hbsRaw.txt),
      html: Handlebars.compile(hbsRaw.html),
    }

    console.log(
      'All mails are now sent.',
      aawait(subscribers.map(user => {
        if (user.id === comment.user_id || !user.email) {
          return
        }

        const unsubscribeUrl =
            `${config.baseUrl}users/unsubscribe?jwt=${user.unsubscribeToken(page.id)}`

        const mailTxt = templates.txt({
          commenter:       comment.user.displayName,
          commentMarkdown: comment.text,
          pageUrl:         page.url,
          unsubscribeUrl,
        })
        const mailHtml = templates.html({
          commenter:   comment.user.displayName,
          commentHtml: markdown.toHTML(comment.text),
          pageUrl:     page.url,
          unsubscribeUrl,
        })

        return Promise.promisify(mailTransport.sendMail, mailTransport)({
          from:    config.email.address,
          to:      user.email,
          subject: `New comment on: ${page.url}`,
          text:    mailTxt,
          html:    mailHtml,
        })
      }))
    )
  })
}
