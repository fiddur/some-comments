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

const url = require('url')

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const user           = require('./user')
const site           = require('./site')
const account        = require('./account')
const page           = require('./page')
const comment        = require('./comment')
const review         = require('./review')
const siteadmin      = require('./siteadmin')
const subscription   = require('./subscription')
const oidc           = require('./oidc')
const oidcIdentifier = require('./oidc_identifier')

const Promise = require('bluebird')

module.exports = async((config) => {
  const Knex = require('knex')
  const Model = require('objection').Model

  const knex = Knex(config.database)
  Model.knex(knex);

  const models = {}

  models.User           = user(models, config)
  models.Site           = site(models)
  models.Page           = page(models)
  models.Comment        = comment(models)
  models.Review         = review(models)
  models.Account        = account(models)
  models.SiteAdmin      = siteadmin(models)
  models.Oidc           = oidc()
  models.OidcIdentifier = oidcIdentifier(models)

  models.User.relationMappings = {
    subscriptions: {
      relation: Model.ManyToManyRelation,
      modelClass: models.Page,
      join: {
        from: 'users.id',
        through: {
          from: 'subscriptions.userId',
          to:   'subscriptions.pageId',
        },
        to:   'pages.id',
      }
    }
  }

  models.Page.relationMappings.comments = {
    relation: Model.OneToManyRelation,
    modelClass: models.Comment,
    join: {
      from: 'pages.id',
      to:   'comments.pageId',
    }
  }

  models.Page.relationMappings.reviews = {
    relation: Model.OneToManyRelation,
    modelClass: models.Review,
    join: {
      from: 'pages.id',
      to:   'reviews.pageId',
    }
  }

  //const Oidc           = oidc(db)
  //const OidcIdentifier = oidcIdentifier(db, Oidc)

  if (config.testMode) {await(knex.migrate.latest())}

  return config.model = models
})
