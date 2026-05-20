const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'drones',
  fields: ['drone_id','model','payload','location','battery_pct','status','notes'],
});
