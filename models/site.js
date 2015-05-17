/**
 * Some Comments - a comment engine
 * Copyright (C) 2015 Fredrik Liljegren
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See
 * the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt
 * GNU-AGPL-3.0
 */

var q = require('q')

/**
 * Site - a site to comment things on.
 */
function Site(id, domain) {
  this.id     = id
  this.domain = domain
}

Site.getAll = function() {
  return global.app.locals.db.all(
    'SELECT s.id, s.domain, u.displayName, u.avatar ' +
      'FROM sites s ' +
      '  LEFT JOIN siteadmins sa ON sa.site = s.id ' +
      '  LEFT JOIN users u ON u.id = sa.user ' +
      'ORDER BY s.id'
  )
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
