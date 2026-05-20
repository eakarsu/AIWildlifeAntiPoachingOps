const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'rangers',
  fields: ['ranger_id','name','rank','base','certifications','status','notes'],
});
