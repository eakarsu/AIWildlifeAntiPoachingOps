const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'supplies',
  fields: ['supply_id','item','qty','location','reorder_point','status','notes'],
});
