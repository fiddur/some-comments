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

var async = require('asyncawait/async')
var await = require('asyncawait/await')

var Q                = require('q')
var passport         = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy
var GithubStrategy   = require('passport-github').Strategy
var GoogleOauth2     = require('passport-google-oauth2').Strategy
var OpenIdConnect    = require('passport-openidconnect')

function setupAnonymous(model, app, anonConfig) {
  app.get(
    '/auth/anonymous',
    async(function(req, res) {
      // Should not be used when already logged in.
      if (req.user) {return res.sendStatus(400)}

      // Create an anonymous user.
      var user = await(model.User.createAnonymous(req.ip))
      await(Q.ninvoke(req, 'login', user))
      res.redirect('/account')
    })
  )
}

function openIdConnectDynamic(model, app, config) {
  var oidcStrategy = new OpenIdConnect.Strategy({
    identifierField:   'oidci',
    scope:             'openid profile email',
  }, function(iss, sub, userInfo, jwtClaims, accessToken, refreshToken, params, done) {
    /// @todo Save identifier -> oidc  connection.

    model.Account.getOrCreate('OpenID Connect:' + iss, sub, {
      displayName: userInfo.displayName,
      avatar:      userInfo.picture,
      email:       userInfo.email,
    })
      .then(function(account) {return account.qGetUser()})
      .then(function(user)    {done(null, user)})
      .done()
  })

  passport.use(oidcStrategy)

  oidcStrategy.configure(function(identifier, done) {
    model.OidcIdentifier.qOne({identifier: identifier})
      .then(function(oidcIdentifier) {
        if (oidcIdentifier) {
          oidcIdentifier.qGetOidc().done(function(oidc) {done(null, oidc)})
        }
        else {
          done(null, null)
        }
      })
      .catch(function(error) {done(error, null)})
      .done()
  })

  OpenIdConnect.config(function(issuer, done) {
    model.Oidc.qOne({issuer: issuer})
      .then(function(oidc) {
        if (oidc) {
          done(null, oidc)
        }
        else {
          done(null, null)
        }
      }, function(error) {done(error, null)})
      .done()
  })

  OpenIdConnect.register(OpenIdConnect.registration({
    name:        'Some Comments',
    redirectURI: config.baseUrl + 'auth/oidc/callback',
  }, function(provider, reg, next) {
    model.Oidc.create([{
      issuer:           provider.issuer,
      authorizationURL: provider.authorizationURL,
      tokenURL:         provider.tokenURL,
      userInfoURL:      provider.userInfoURL,
      registrationURL:  provider.registrationURL,
      clientID:         reg.clientID,
      clientSecret:     reg.clientSecret,
      expiresAt:        reg.expiresAt
    }])
      .done(function(oidcs) {next()})
  }))

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
    function(req, res) {res.redirect('/account')}
  )
}

function openIdConnectProvider(app, model, baseUrl, provider) {
  var oidcStrategy = new OpenIdConnect.Strategy({
    name:             provider.shortName,
    authorizationURL: provider.authorizationURL,
    tokenURL:         provider.tokenURL,
    userInfoURL:      provider.userInfoURL,
    clientID:         provider.clientID,
    clientSecret:     provider.clientSecret,
    scope:            'openid profile email',
  }, function(iss, sub, userInfo, jwtClaims, accessToken, refreshToken, params, done) {
    model.Account.getOrCreate(provider.shortName, sub, {
      displayName: userInfo.displayName,
      avatar:      userInfo.picture || '',
      email:       userInfo.email,
    })
      .then(function(account) {return account.qGetUser()})
      .then(function(user)    {done(null, user)})
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
    function(req, res) {res.redirect('/account')}
  )
}

function facebook(app, provider, model, baseUrl) {
  var defaultIcon = 'https://upload.wikimedia.org/wikipedia/commons/c/c2/F_icon.svg'
  provider.icon = provider.icon || defaultIcon

  passport.use(new FacebookStrategy(
    {
      clientID:     provider.clientID,
      clientSecret: provider.clientSecret,
      callbackURL:  baseUrl + 'auth/facebook/callback',
    },
    function(accessToken, refreshToken, profile, done) {
      model.Account.getOrCreate('Facebook', profile._json.id, {
        displayName: profile.displayName,
        avatar:      'http://graph.facebook.com/' + profile._json.id + '/picture',
        email:       profile._json.email,
      })
        .then(function(account) {return account.qGetUser()})
        .then(function(user) {done(null, user)})
        .done()
    }
  ))

  app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['public_profile','email']}))
  app.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', {failureRedirect: '/login'}),
    function(req, res) {res.redirect('/account')}
  )
}

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next() }
  res.sendStatus(403)
}

function setup(app, model, config) {
  app.use(passport.initialize())
  app.use(passport.session())

  // serialize and deserialize
  passport.serializeUser(function(user, done) {
    done(null, user.id)
  })
  passport.deserializeUser(function(id, done) {
    model.User.get(id)
      .then(
        function(user)  {done(null, user)},
        function(error) {done(null, null)}
      )
  })

  app.get('/login', function(req, res) {res.render('login', {config: config})})
  app.get('/account', ensureAuthenticated, function(req, res) {
    res.render('account', {user: req.user})
  })

  if (config.testMode) {
    app.get('/login/:id', function(req, res, next) {
      var user = {id: req.params.id}
      req.logIn(user, function(err) {
        if (err) {return next(err)}
        res.json('done')
      })
    })
  }

  app.get('/logout', function(req, res) {
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

    for (var i = 0, len = config.authenticators.openidconnect.length; i < len; i++) {
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

exports.setup = setup
