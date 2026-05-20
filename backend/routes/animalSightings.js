const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'animal_sightings',
  fields: ['sighting_id','species','location','observer','ts','count','notes'],
});
