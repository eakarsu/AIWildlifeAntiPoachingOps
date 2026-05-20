const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'patrols',
  fields: ['patrol_id','ranger_lead','start_at','end_at','route','status','notes'],
});
