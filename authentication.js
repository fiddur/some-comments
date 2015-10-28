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

'use strict'

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Promise          = require('bluebird')
const passport         = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const GithubStrategy   = require('passport-github').Strategy
const GoogleOauth2     = require('passport-google-oauth2').Strategy
const OpenIdConnect    = require('passport-openidconnect')

const setupAnonymous = (model, app, anonConfig) => {
  app.get(
    '/auth/anonymous',
    async((req, res) => {
      // Should not be used when already logged in.
      if (req.user) {return res.sendStatus(400)}

      // Create an anonymous user.
      const user = await(model.User.createAnonymous(req.ip))
      await(Promise.promisify(req.login, req)(user))
      res.redirect('/account')
    })
  )
}

const openIdConnectDynamic = (model, app, config) => {
  const oidcStrategy = new OpenIdConnect.Strategy({
    identifierField:   'oidci',
    scope:             'openid profile email',
  }, async((iss, sub, userInfo, jwtClaims, accessToken, refreshToken, params, done) => {
    /// @todo Save identifier -> oidc  connection.
    const account = await(model.Account.getOrCreate('OpenID Connect:' + iss, sub, {
      displayName: userInfo.displayName,
      avatar:      userInfo.picture,
      email:       userInfo.email,
    }))
    const user = await(account.getUser()) /// @todo test
    done(null, user)
  }))

  passport.use(oidcStrategy)

  oidcStrategy.configure(async((identifier, done) => {
    const oidcIdentifier = await(model.OidcIdentifier.get(identifier))

    if (oidcIdentifier) {
      console.log(oidcIdentifier)
      oidcIdentifier.getOidc().done((oidc) => done(null, oidc))
    }
    else {
      done(null, null)
    }
  }))

  OpenIdConnect.config(async((issuer, done) => {
    const oidc = await(model.Oidc.getByIssuer(issuer))

    if (oidc) {
      done(null, oidc)
    }
    else {
      done(null, null)
    }
  }))

  OpenIdConnect.register(OpenIdConnect.registration({
    name:        'Some Comments',
    redirectURI: config.baseUrl + 'auth/oidc/callback',
  }, async((provider, reg, next) => {
    const oidcs = await(model.Oidc.create([{
      issuer:           provider.issuer,
      authorizationURL: provider.authorizationURL,
      tokenURL:         provider.tokenURL,
      userInfoURL:      provider.userInfoURL,
      registrationURL:  provider.registrationURL,
      clientID:         reg.clientID,
      clientSecret:     reg.clientSecret,
      expiresAt:        reg.expiresAt
    }]))
    next()
  })))

  app.get(
    '/auth/oidc',
    passport.authenticate('openidconnect', {
      callbackURL:      config.baseUrl + 'auth/oidc/callback',
      failureRedirect:  '/login',
    })
  )
  app.get(
    '/auth/oidc/callback',
    passport.authenticate('openidconnect', {
      callbackURL:      config.baseUrl + 'auth/oidc/callback',
      failureRedirect:  '/login',
    }),
    (req, res) => {res.redirect('/account')}
  )
}

const openIdConnectProvider = (app, model, baseUrl, provider) => {
  const oidcStrategy = new OpenIdConnect.Strategy({
    name:             provider.shortName,
    authorizationURL: provider.authorizationURL,
    tokenURL:         provider.tokenURL,
    userInfoURL:      provider.userInfoURL,
    clientID:         provider.clientID,
    clientSecret:     provider.clientSecret,
    scope:            'openid profile email',
  }, (iss, sub, userInfo, jwtClaims, accessToken, refreshToken, params, done) => {
    model.Account.getOrCreate(provider.shortName, sub, {
      displayName: userInfo.displayName,
      avatar:      userInfo.picture || '',
      email:       userInfo.email,
    })
      .then((account) => account.getUser())  /// @todo test
      .then((user)    => done(null, user))
      .done()
  })

  passport.use(oidcStrategy)

  app.get(
    '/auth/' + provider.shortName,
    passport.authenticate(provider.shortName, {
      callbackURL:      baseUrl + 'auth/' + provider.shortName + '/callback',
      failureRedirect:  '/login',
    })
  )
  app.get(
    '/auth/' + provider.shortName + '/callback',
    passport.authenticate(provider.shortName, {
      callbackURL:      baseUrl + 'auth/' + provider.shortName + '/callback',
      failureRedirect:  '/login',
    }),
    (req, res) => res.redirect('/account')
  )
}

const facebook = (app, provider, model, baseUrl) => {
  const defaultIcon = 'https://upload.wikimedia.org/wikipedia/commons/c/c2/F_icon.svg'
  provider.icon = provider.icon || defaultIcon

  passport.use(new FacebookStrategy(
    {
      clientID:     provider.clientID,
      clientSecret: provider.clientSecret,
      callbackURL:  baseUrl + 'auth/facebook/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      model.Account.getOrCreate('Facebook', profile._json.id, {
        displayName: profile.displayName,
        avatar:      'http://graph.facebook.com/' + profile._json.id + '/picture',
        email:       profile._json.email,
      })
        .then((account) => account.getUser())  /// @todo test
        .then((user)    => done(null, user))
        .done()
    }
  ))

  app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['public_profile','email']}))
  app.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', {failureRedirect: '/login'}),
    (req, res) => res.redirect('/account')
  )
}

// test authentication
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) { return next() }
  res.sendStatus(403)
}

exports.setup = (app, model, config) => {
  app.use(passport.initialize())
  app.use(passport.session())

  // serialize and deserialize
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    model.User.get(id)
      .then((user) => done(null, user))
      .catch((error) => done(null, null))
  })

  app.get('/login', (req, res) => res.render('login', {config: config}))
  app.get('/account', ensureAuthenticated, (req, res) => res.render('account', {user: req.user}))

  if (config.testMode) {
    app.get('/login/:id', (req, res, next) => {
      const user = {id: req.params.id}
      req.logIn(user, (err) => {
        if (err) {return next(err)}
        res.json('done')
      })
    })
  }

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  // Setup anonymous "authentication" :)
  if ('anonymous' in config.authenticators) {
    setupAnonymous(model, app, config.authenticators.anonymous)
  }

  // Setup OpenID Connect authentication
  if ('openidconnect' in config.authenticators) {
    openIdConnectDynamic(model, app, config)

    for (let i = 0, len = config.authenticators.openidconnect.length; i < len; i++) {
      openIdConnectProvider(
        app, model, config.baseUrl.toString(), config.authenticators.openidconnect[i]
      )
    }
  }

  // Setup Facebook authentication
  if ('facebook' in config.authenticators) {
    facebook(app, config.authenticators.facebook, model, config.baseUrl.toString())
  }
}
