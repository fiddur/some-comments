Some comments
=============

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


Todo
----
* Display already logged in instead of "Foo Bar".
* Reasonable logging.
* Error handling.
* Testing.
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
