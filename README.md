Some comments
=============

[![Build Status](https://travis-ci.org/fiddur/some-comments.svg)](https://travis-ci.org/fiddur/some-comments)
[![Coverage Status](https://coveralls.io/repos/fiddur/some-comments/badge.svg)](https://coveralls.io/r/fiddur/some-comments)

Aims to become a free standing commenting system that you attach by including javascript.  I need
this because Ghost has no commenting function and I don't want ads funded commenting, nor tie it to
one specific social platform.

All the commenters have to authenticate via 3rd party authentication like openid, google, facebook
etc; currently anything that "passport" supports.

This is not ready for use.  I'm experimenting in learning nodejs, and I haven't even found a good
name.  My working names were "restful comments" and "comment anything", but they are both already
taken.


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


Install (server)
----------------
This is tested on Node 0.10.

```
git clone https://github.com/fiddur/some-comments.git
cd some-comments
npm install
cp config.js.example config.js # Edit to configure…
node index.js
```

To run in production I suggest using [forever](https://github.com/foreverjs/forever).



Configuration
-------------

Configuration is done in `config.js`, or by filename sent in as an argument like `node index.js
myalternativeconfigpath.js`.

### Server

State protocol, domain and port.  If you use a proxy, this should be the proxies values; used for
URLs in redirect etc.

```javascript
server: {
  protocol: 'http'
  domain:   'localhost',
  port:     1337,
}
```

### Connectors

These are the ways the user can authenticat.  *Some Comments* have no authentication of it's own,
but relies solely on other systems.


#### Dynamic [OpenID Connect](http://openid.net/connect/) (NOT older OpenID 2.0 or less)

To use Dynamic OpenID, simply include `openidconnect` with an empty array:

```javascript
connectors: {
  openidconnect: []
}
```

If you add objects in the array (see below), Dynamic Registration will still be available.


#### OpenID Connect without Dynamic (e.g. Google)

For OpenID Connect endpoints that haven't implemented Dynamic Client Registration, you need to
supply API credentials.  For example:

```javascript
connectors: {
  openidconnect: [
    {
      title:            'Google OpenID Connect',
      shortName:        'google',
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL:         'https://www.googleapis.com/oauth2/v4/token',
      userInfoURL:      'https://www.googleapis.com/oauth2/v3/userinfo',
      clientID:         'get your own',
      clientSecret:     'get your own',
    }
  ]
}
```

For Google, you get your API credentials at [the Developers
Console](https://console.developers.google.com/).  Add an Oauth Client, with redirect URIs in the
form: `http(s)://yourdomain.org/auth/<shortName>/callback`.  The `shortName` is a URL fragment and
is needed to separate the callback URIs for each openidconnect issuer.


#### Facebook

```javascript
connectors: {
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

### 0.2.0

* Using [node-orm2](https://github.com/dresende/node-orm2) to get simple models, support different
  backends and handle migrations.
* Sending notifications of new comments with [Nodemailer](https://github.com/andris9/Nodemailer).
* Using canonical URL to identify pages.


### 0.1.0

Working simple version.

* OpenID Connect authentication
* Simple commenting testing endpoint: `/test`
* Endpoint to get logged in users info: `/users/me`
* Some configuration documentation.
* Better code separation using factories, started using express router.

Still no email notification…


License
-------

Copyright (C) 2015 Fredrik Liljegren <fredrik@liljegren.org>

Some Comments is free software: you can redistribute it and/or modify it under the terms of the GNU
Affero General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Affero General Public License for more details.

See COPYING.
