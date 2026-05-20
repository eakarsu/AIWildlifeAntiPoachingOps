const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'ranger_shifts',
  fields: ['shift_id','ranger_id','start_at','end_at','sector','status','notes'],
});
