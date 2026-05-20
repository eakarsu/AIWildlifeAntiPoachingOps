const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'weapons_recovered',
  fields: ['weapon_id','type','caliber','location','recovered_at','case_id','notes'],
});
