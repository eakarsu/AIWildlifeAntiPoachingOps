const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'parks',
  fields: ['park_id','name','area_km2','region','hq','status','notes'],
});
