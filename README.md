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
