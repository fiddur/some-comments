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


Install (server)
----------------
```
git clone https://github.com/fiddur/some-comments.git
cd some-comments
npm install
cp config.js.example config.js # Edit to add your API-keys for wanted services
node index.js
```

To run in production I suggest using [forever](https://github.com/foreverjs/forever).

node 0.10 seems to be easier to install; for me sqlite3 fails to build on 0.11.


Client usage
------------
Make sure you added your site (with Site.add(server, domain)). (No frontend yet.)

Where you want to enable commenting, add something like (replacing site id and post id):

```html
<div class="comments" id="comments"></div>
<script src="http://somecomment.domain/node_modules/markdown/lib/markdown.js"></script>
<script src="http://somecomment.domain/node_modules/q/q.js"></script>
<script src="http://somecomment.domain/client.js"></script>
<script>
  SomeComments('http://somecomment.domain/').displayByPage(1, 'post-{{id}}', 'comments')
</script>
```


Configuration
-------------

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

Right now it uses sqlite3.  In the future this will be more configurable.


Changelog
---------

### 0.1.0

Working simple version.

* OpenID Connect authentication
* Simple commenting testing endpoint: `/test`
* Endpoint to get logged in users info: `/users/me`
* Some configuration documentation.
* Better code separation using factories, started using express router.

Still no email notification…


Todo
----
* Make real subscription model and endpoints to configure.
* Notify subscribers on new comments.
* Display already logged in instead of "Foo Bar".
* Database migrations and other db options.
* Use express router consistently.
* Reasonable logging.
* Error handling.
* Add more login-services from node-passport.
* Admin frontend for adding/managing a site.
* User page to see/remove comments on all sites on a server.


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
