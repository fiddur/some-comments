POST /login
===========

Payload `application/x-www-form-urlencoded`: `account=sub@iss`.

For anonymous commenters, the `iss` is set to `anonymous`.

Each service should have a `make start-test-service`, that outputs on
listening: `listening on port ${port} in process ${process.pid}.`


Configuration
-------------

* `ACCESS_TOKEN_SECRET`
* `ES_ENDPOINT`
* `USERS_STREAM`
* `PORT`


Compliance
----------

1. Handle anonymous logins:

  * If the `account` has `iss` set to `anonymous`, create a user with given
    `sub` as `display_name`.

2. Implement OIDC (requires a GET endpoint as well).

3. Return `access_token` for authenticated user.

  * `user` set to user uuid.

  * `aud` set to site uuid.

  * `scope` as aray containing `comment` and possibly `siteadmin`.
