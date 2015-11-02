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

const async = require('asyncawait/async')
const await = require('asyncawait/await')

const Model = require('objection').Model

module.exports = (models) => {
  function OidcIdentifier() {Model.apply(this, arguments)}
  Model.extend(OidcIdentifier)

  OidcIdentifier.tableName = 'oidcIdentifiers'

  OidcIdentifier.relationMappings = {
    oidc: {
      relation: Model.OneToOneRelation,
      modelClass: models.Oidc,
      join: {
        from: 'oidcidentifier.oidcId',
        to:   'oidc.id',
      }
    },
  }

  OidcIdentifier.get = (identifier) =>
    OidcIdentifier.query().where({identifier: identifier}).first()


  /************************************************************************************************
   * Instance methods
   ************************************************************************************************/

  OidcIdentifier.prototype.getOidc = async(function() {
    return await(this.$loadRelated('oidc')).oidc
  })

  return OidcIdentifier
}
