const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'vehicles',
  fields: ['vehicle_id','type','plate','fuel_status','location','status','notes'],
});
