const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'camera_traps',
  fields: ['camera_id','location','model','install_date','last_event','status','notes'],
});
