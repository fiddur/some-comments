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

var passport         = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy
var GithubStrategy   = require('passport-github').Strategy
var GoogleOauth2     = require('passport-google-oauth2').Strategy
var OpenIdConnect    = require('passport-openidconnect')

function openIdConnectDynamic(model, app, config) {
  var host = config.server.protocol + '://' + config.server.domain + ':' + config.server.port

  var oidc_strategy = new OpenIdConnect.Strategy({
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

  passport.use(oidc_strategy)

  oidc_strategy.configure(function(identifier, done) {
    model.OidcIdentifier.qOne({identifier: identifier})
      .then(function(oidcIdentifier) {
        if (oidcIdentifier) {oidcIdentifier.qGetOidc().done(function(oidc) {done(null, oidc)})}
        else {done(null, null)}
      })
      .catch(function(error) {done(error, null)})
      .done()
  })

  OpenIdConnect.config(function(issuer, done) {
    model.Oidc.qOne({issuer: issuer})
      .then(function(oidc) {
        if (oidc) {done(null, oidc)}
        else      {done(null, null)}
      }, function(error) {done(error, null)})
      .done()
  })

  OpenIdConnect.register(OpenIdConnect.registration({
    name:        'Some Comments',
    redirectURI: host + '/auth/oidc/callback',
  }, function(provider, reg, next) {
    console.log('Saving info for provider', provider, 'reg', reg)
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
      callbackURL:      host + '/auth/oidc/callback',
      failureRedirect:  '/login',
    })
  )
  app.get(
    '/auth/oidc/callback',
    passport.authenticate('openidconnect', {
      callbackURL:      host + '/auth/oidc/callback',
      failureRedirect:  '/login',
    }),
    function(req, res) {res.redirect('/account')}
  )
}

function openIdConnectProvider(app, model, host, provider) {
  var oidc_strategy = new OpenIdConnect.Strategy({
    name:             provider.shortName,
    authorizationURL: provider.authorizationURL,
    tokenURL:         provider.tokenURL,
    userInfoURL:      provider.userInfoURL,
    clientID:         provider.clientID,
    clientSecret:     provider.clientSecret,
    scope:            'openid profile email',
  }, function(iss, sub, userInfo, jwtClaims, accessToken, refreshToken, params, done) {
    console.log('Got userinfo from provider:', userInfo)
    model.Account.getOrCreate(provider.shortName, sub, {
      displayName: userInfo.displayName,
      avatar:      userInfo.picture || '',
      email:       userInfo.email,
    })
      .then(function(account) {return account.qGetUser()})
      .then(function(user)    {done(null, user)})
      .done()
  })

  passport.use(oidc_strategy)

  app.get(
    '/auth/' + provider.shortName,
    passport.authenticate(provider.shortName, {
      callbackURL:      host + '/auth/' + provider.shortName + '/callback',
      failureRedirect:  '/login',
    })
  )
  app.get(
    '/auth/' + provider.shortName + '/callback',
    passport.authenticate(provider.shortName, {
      callbackURL:      host + '/auth/' + provider.shortName + '/callback',
      failureRedirect:  '/login',
    }),
    function(req, res) {res.redirect('/account')}
  )
}

function facebook(app, provider, model, host) {
  passport.use(new FacebookStrategy(
    {
      clientID:     provider.clientId,
      clientSecret: provider.clientSecret,
      callbackURL:  host + '/auth/facebook/callback',
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('Got facebook data:', profile)
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
  var host = config.server.protocol + '://' + config.server.domain + ':' + config.server.port

  app.use(passport.initialize())
  app.use(passport.session())

  // serialize and deserialize
  passport.serializeUser(function(user, done) {
    done(null, user.id)
  })
  passport.deserializeUser(function(id, done) {
    model.User.qGet(id)
      .then(
        function(user)  {done(null, user)},
        function(error) {
          /// @todo Remove user from session.
          console.log('Deserialize ', error)
          done(null, null)
          //done(error, null)
        }
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

  // Setup OpenID Connect authentication
  if ('openidconnect' in config.connectors) {
    openIdConnectDynamic(model, app, config)

    for (var i = 0, len = config.connectors.openidconnect.length; i < len; i++) {
      openIdConnectProvider(app, model, host, config.connectors.openidconnect[i])
    }
  }

  // Setup Facebook authentication
  if ('facebook' in config.connectors) {facebook(app, config.connectors.facebook, model, host)}
}

exports.setup = setup
