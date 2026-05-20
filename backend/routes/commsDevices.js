const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'comms_devices',
  fields: ['device_id','type','owner_id','location','last_check','status','notes'],
});
