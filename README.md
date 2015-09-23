Some comments
=============

[![Build Status](https://travis-ci.org/fiddur/some-comments.svg?branch=master)](https://travis-ci.org/fiddur/some-comments)
[![Coverage Status](https://coveralls.io/repos/fiddur/some-comments/badge.svg?branch=master&service=github)](https://coveralls.io/r/fiddur/some-comments?branch=master)

**Some comments** is stand-alone commenting microservice that you could attach by including
javascript.

This was initially constructed because Ghost has no built in commenting functionality and I don't
want ads funded commenting, nor tie it to one specific social platform.

Commenters can authenticate via 3rd party authentication like openid, google, facebook etc, or
comment anonymously.



Features
--------

* External authentication.
* Plugged into any page with javascript.
* E-mail notification to commenters (with unsubscribe-link).
* Anonymous commenting, if configured to allow.


Client usage
------------

Get your site ID on `http://somecomment.domain/sites/` (running your own node or using my example
at [fredrik.liljegren.org:1337](http://fredrik.liljegren.org:1337/sites/)).

Make sure you added your site (with Site.add(server, domain)) at installation `/sites/` and get
your `site_id`.

Where you want to enable commenting, add something like (replacing site id and url):

```html
<div class="comments" id="comments"></div>
<script src="http://somecomment.domain/node_modules/markdown/lib/markdown.js"></script>
<script src="http://somecomment.domain/node_modules/q/q.js"></script>
<script src="http://somecomment.domain/client.js"></script>
<script>
  SomeComments('http://somecomment.domain/').displayByPage({{site_id}}, '{{url}}', 'comments')
</script>
```

The `url` should be the pages canonical URL and will be used in notification e-mails.

And, add the css:
```html
<link href="http://somecomment.domain/comments.css" rel="stylesheet" />
```


Install (server)
----------------

This is tested on Node 0.10, 0.12, and v4.0.0, and io.js.

```
git clone https://github.com/fiddur/some-comments.git
cd some-comments
npm install
cp config.js.example config.js # Edit to configure…
npm install -g grunt-cli       # if you don't already have it…
grunt migrate:up
node index.js
```

To run in production I suggest using [forever](https://github.com/foreverjs/forever).


Configuration
-------------

Configuration is done in `config.js`, or by filename sent in as an argument like `node index.js
myalternativeconfigpath.js`.

### Secret

Used for symmetric encryption of JSON Web Tokens.

```javascript
secret: 'aRandomString',
```


### BaseUrl

State protocol, domain and port.  If you use a proxy, this should be the proxies values; used for
URLs in redirect etc.

```javascript
baseUrl: 'http://example.net:1337/',
```

### Authenticators

These are the ways the user can authenticat.  *Some Comments* have no authentication of it's own,
but relies solely on other systems.


#### Anonymous

To allow anonymous commenting, include anonymous in authenticators.  It could be as `{}`, but you
could also configure default displayName (default: 'Anonymous') and default avatar (could be a URL
or `gravatar(method)` where method is one of the defaults in
[Gravatar](https://en.gravatar.com/site/implement/images/https://en.gravatar.com/site/implement/images/);
defaults to `gravatar(monsterid)`.

When commenting anonymously, you will get an automatically created user.  Further comments will be
as that user until your session ends.


#### Dynamic [OpenID Connect](http://openid.net/connect/) (NOT older OpenID 2.0 or less)

To use Dynamic OpenID, simply include `openidconnect` with an empty array:

```javascript
authenticators: {
  openidconnect: []
}
```

If you add objects in the array (see below), Dynamic Registration will still be available.


#### OpenID Connect without Dynamic (e.g. Google)

For OpenID Connect endpoints that haven't implemented Dynamic Client Registration, you need to
supply API credentials.  For example:

```javascript
authenticators: {
  openidconnect: [
    {
      title:            'Google',
      shortName:        'google',
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL:         'https://www.googleapis.com/oauth2/v4/token',
      userInfoURL:      'https://www.googleapis.com/oauth2/v3/userinfo',
      clientID:         'get your own',
      clientSecret:     'get your own',
      icon:             'https://upload.wikimedia.org/wikipedia/commons/4/4d/Google_Icon.svg',
    }
  ]
}
```

For Google, you get your API credentials at [the Developers
Console](https://console.developers.google.com/).  Add an Oauth Client, with redirect URIs in the
form: `http(s)://yourdomain.org/auth/<shortName>/callback`.  The `shortName` is a URL fragment and
is needed to separate the callback URIs for each openidconnect issuer.

Note: It's only the `icon` that is displayed in the login list on default login frame.


#### Facebook

```javascript
authenticators: {
  facebook: [
    {
      clientId:     'get your own',
      clientSecret: 'get your own',
    }
  ]
}
```

Callback URI will be `http(s)://domain/auth/facebook/callback`.


### Database

Anything that [node-orm2](https://github.com/dresende/node-orm2) supports.

To use a backend, simply install it:

```bash
npm install sqlite3
```

…and use it in your config:
```javascript
database: 'sqlite:///var/lib/some-comments.db'
```

…and run the migrations:
```
DB_URL=sqlite:///var/lib/some-comments.db ./node_modules/.bin/migrate up
```

Whatever is in `config.database` will be passed on to
[orm.connect](https://github.com/dresende/node-orm2/wiki/Connecting-to-Database).


### E-mail notifications

```javascript
email: {
  address: 'noreply@example.com',
  transport: {
    host: 'smtp.example.com',
    port: 25,
    auth: {
      user: 'username',
      pass: 'password',
    }
  },
}
```

`address` is the outgoing address used for notifications.

By default, `transport` is your SMTP settings.  It will be sent directly to
`nodemailer.createTransport`, so it can use what
[Nodemailer](https://github.com/andris9/Nodemailer) can use.  To use a a non-builtin transport, you
could for example `npm install nodemailer-sendmail-transport` and in config put `transport:
require('nodemailer-sendmail-transport')(options)`.


Changelog
---------

### 0.3.0

**Upgrade from 0.2**: `grunt migrate:up`

* #4: Subscribing site admin to new pages.
* Nicer looking OpenID Connect input.
* More verbose test-page.
* Bugfix: oidcIdentifiers had wrong table name.


### 0.2.0

**There is no automatic upgrade from 0.1 to 0.2**

To updgrade, you need to create the new tables with migration scripts, and transfer the data
accordingly.  The new db-structure needs data that isn't available in 0.1.

* Using [node-orm2](https://github.com/dresende/node-orm2) to get simple models, support different
  backends and handle migrations.
* Sending notifications of new comments with [Nodemailer](https://github.com/andris9/Nodemailer).
* Using canonical URL to identify pages.
* Adding configurations: `secret`, `email`.
* Changed configuration `connector` into `authenticator`.
* Changed configuration `server` into `baseUrl`.
* Added anonymous commenting.


### 0.1.0

Working simple version.

* OpenID Connect authentication
* Simple commenting testing endpoint: `/test`
* Endpoint to get logged in users info: `/users/me`
* Some configuration documentation.
* Better code separation using factories, started using express router.

Still no email notification…


License ([GNU AGPLv3](http://www.gnu.org/licenses/agpl-3.0.html))
-----------------------------------------------------------------

Copyright (C) 2015 Fredrik Liljegren <fredrik@liljegren.org>

Some Comments is free software: you can redistribute it and/or modify it under the terms of the GNU
Affero General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Affero General Public License for more details.

See COPYING.
