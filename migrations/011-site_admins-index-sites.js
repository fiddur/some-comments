exports.up = function (next) {
  this.addIndex('site_admins_site_id_index', {
    table:   'site_admins',
    columns: ['site_id']
  }, next)
}

exports.down = function (next) {
  this.dropIndex('site_admins_site_id_index', 'site_admins', next)
}
