const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'training_records',
  fields: ['record_id','ranger_id','course','completed_at','score','status','notes'],
});
