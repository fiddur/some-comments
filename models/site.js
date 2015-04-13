var q = require('q')

/**
 * Site - a site to comment things on.
 */
function Site(id, domain) {
  this.id     = id
  this.domain = domain
}
Site.add = function(domain) {
  return global.app.locals.db
    .run('INSERT INTO sites (domain) VALUES (?)', domain)
    .then(function(db) {
      console.log('Created Site', db.lastID, domain)
      return new Site(db.lastID, domain)
    })
}
Site.getByOrigin = function(origin) {
  var domain = origin.split('//')[1]
  console.log('Getting site by ' + domain)
  var deferred = q.defer()
  global.app.locals.db
    .get('SELECT * FROM sites WHERE domain = ?', domain)
    .then(function(site) {
      if (typeof site === 'undefined') {return deferred.reject('No site with domain ' + domain)}
      deferred.resolve(new Site(site.id, site.domain))
    }, function(error) {deferred.reject(error)})

  return deferred.promise
}
Site.prototype.addAdmin = function(user) {
  return global.app.locals.db
    .run('INSERT INTO siteadmins (site, user) VALUES (?,?)', this.id, user.id)
}

module.exports = Site
