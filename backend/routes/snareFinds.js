const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'snare_finds',
  fields: ['snare_id','location','type','found_by','found_at','status','notes'],
});
