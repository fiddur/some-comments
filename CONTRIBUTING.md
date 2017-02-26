Contributing
============

* Immutable.  Don't mutate state, always use `const`.  (Exception: replacing
  the complete datastore of a module...)

* Functional.  Work with data, not method-carrying object.

* Comment on issue to let others know you started implementing something.
  Discuss data & code design on the issue.

* Use [gitflow](https://github.com/nvie/gitflow) branching model - make pull
  requests toward the `develop` branch.

* Use eslint for code formatting.
  * Skip unnecessary semicolons.

* Use ES6 `const`, `=>`, prefer `async/await` before explicit promises.

* Make sure new code is tested both with relevant unit tests and integration
  tests.

* See [TODO](TODO.md) for refactorings waiting to happen…

* Configuration goes into environment - this should be easily runnable in an
  immutable container.

* `require` should not have side effects.

* Consider parallellising of both comment service and storage in everything.

* Use manual currying to distinguish the pure factories from the impure
  executioners, like `myFunc = (general, params) => (execution, args) => {...}`

* Settings are EVIL!  ...make extensibility in clients.


Architecture
------------

This is about comments, designed for a blog.

Extensibility lives in the client, don't complect the code!




### Event streams and events

* user

* comment

* page

* site

* siteadmin

* subscription

* oidc_clients


### Things that belong elsewhere

* Rate limiting - should be done in a proxy layer.

* Hiding avatars - can be done with CSS.

* Changing comment display order - can be done with other client js.

