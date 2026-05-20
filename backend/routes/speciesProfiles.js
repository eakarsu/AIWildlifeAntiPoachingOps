const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'species_profiles',
  fields: ['species_id','common_name','scientific','status_iucn','habitat','notes'],
});
