Add a config.js like this:

```javascript
module.exports = {
  host: 'http://ydalar.xn--hksgrd-juac2m.se:3000',

  oidcProviders: {
    google: {
      issuer:        'https://accounts.google.com',
      client_id:     'get your',
      client_secret: 'own',
    },
  },
}
```
