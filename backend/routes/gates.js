const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'gates',
  fields: ['gate_id','park_id','name','location','status','last_check','notes'],
});
