Some comments
=============

**Some comments** is stand-alone commenting microservice that you could attach
by including javascript.

This was initially constructed because Ghost has no built in commenting
functionality and I don't want ads funded commenting, nor tie it to one
specific social platform.

Commenters can authenticate via the OpenID Connect protocol (supported by
e.g. Google) or comment anonymously with a name.

This is a split up, polyglot CQRS microservices playground and showcase.  The
goal is to show benefits and costs of that type of architecture, while trying
out approaches.


Server setup
------------

### Routing

Each endpoint is in its own service, having different implementations.  Start
up at least one version of each endpoint, use a proxy like haproxy or nginx to
route:

* POST /login
* POST /comments/
* GET /comments/


### Startup server cluster locally

Probably:

```
SC_CONFIG_FILE=config.js make start
```

Changelog
---------

### 0.5.0

**Breaking version**

Breaking completely with older versions in both architecture and datastore.


License ([GNU AGPLv3](http://www.gnu.org/licenses/agpl-3.0.html))
-----------------------------------------------------------------

Copyright (C) 2015 Fredrik Liljegren <fredrik@liljegren.org>

Some Comments is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

See COPYING.
