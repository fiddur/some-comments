'use strict'

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Knex = require('knex')

const configFile = process.argv[2] || 'config.js'
const config = require('./' + configFile)

const main = async(function() {
  const knex = Knex(config.database)

  if (await(knex.schema.hasTable('knex_migrations'))) {
    console.log('This is at least 0.4.0.  Bailing out.')
    process.exit()
  }
  if (!await(knex.schema.hasTable('orm_migrations'))) {
    console.log('WARNING: This is not 0.3.0, but I\'ll try anyway.')
  }

  console.log('Migrating from 0.3.0 to 0.4.0')

  // Suffix all tables with 'Old'.
  const tables = [
    'users', 'sites', 'siteadmins', 'accounts', 'pages', 'subscriptions', 'comments', 'oidc',
    'oidcIdentifiers'
  ].forEach((table) => {
     await(knex.schema.renameTable(table, table + 'Old'))
   })

  // Remove still unused superadmin table.
  await(knex.schema.dropTable('superadmins'))
  await(knex.schema.dropTable('orm_migrations'))

  // Create tables with the new migrations.
  await(knex.migrate.latest())

  // Copy users
  await(knex.raw(
    'INSERT INTO users (id, displayName, avatar, email, anonymousIp)' +
      '  SELECT id, displayName, avatar, email, anonymousIp' +
      '  FROM usersOld'
  ))
  console.log(await(knex('users').select()))

  // Copy sites
  await(knex.raw(
    'INSERT INTO sites (id, domain, maxLevels)' +
      '  SELECT id, domain, maxLevels' +
      '  FROM sitesOld'
  ))
  console.log(await(knex('sites').select()))

  // Site admins
  await(knex.raw(
    'INSERT INTO siteadmins (siteId, userId)' +
      '  SELECT site_id, user_id' +
      '  FROM siteadminsOld'
  ))
  console.log(await(knex('siteadmins').select()))

  // Accounts
  await(knex.raw(
    'INSERT INTO accounts (id, uid, authenticator, userId)' +
      '  SELECT id, uid, authenticator, user_id' +
      '  FROM accountsOld'
  ))
  console.log(await(knex('accounts').select()))

  // Pages
  await(knex.raw(
    'INSERT INTO pages (id, url, siteId)' +
      '  SELECT id, url, site_id' +
      '  FROM pagesOld'
  ))
  console.log(await(knex('pages').select()))

  // Subscriptions
  await(knex.raw(
    'INSERT INTO subscriptions (userId, pageId)' +
      '  SELECT userId, pageId' +
      '  FROM subscriptionsOld'
  ))
  console.log(await(knex('subscriptions').select()))

  // Comments
  await(knex.raw(
    'INSERT INTO comments (id, text, userId, pageId, parentId, createdAt, modifiedAt, deletedAt)' +
      '  SELECT id, text, user_id, page_id, parent_id, createdAt, modifiedAt, deletedAt' +
      '  FROM commentsOld'
  ))
  console.log(await(knex('comments').select()))

  // Oidc
  await(knex.raw(
    'INSERT INTO oidc (id, issuer, authorizationURL, tokenURL, userInfoURL, registrationURL,' +
      '                clientID, clientSecret, expiresAt)' +
      '  SELECT id, issuer, authorizationURL, tokenURL, userInfoURL, registrationURL,' +
      '         clientID, clientSecret, expiresAt' +
      '  FROM oidcOld'
  ))
  console.log(await(knex('oidc').select()))

  // oidcIdentifiers
  await(knex.raw(
    'INSERT INTO oidcIdentifiers (identifier, oidcId)' +
      '  SELECT identifier, oidc_id' +
      '  FROM oidcIdentifiersOld'
  ))
  console.log(await(knex('oidcIdentifiers').select()))

  process.exit()
})

main().done()

/**

Here's the manual "diff" between 0.3 and current…

-- Table missing in current
CREATE TABLE `oidc` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT ,
  `issuer` TEXT ,
  `authorizationURL` TEXT ,
  `tokenURL` TEXT ,
  `userInfoURL` TEXT ,
  `registrationURL` TEXT ,
  `clientID` TEXT ,
  `clientSecret` TEXT ,
  `expiresAt` INTEGER
);

-- Table missing in current
CREATE TABLE `oidcIdentifiers` (`identifier` TEXT NOT NULL , `oidc_id` INTEGER );

-- Table missing in current - Drop it until further use?
DROP TABLE `superadmins`

*/
