const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'court_cases',
  fields: ['case_id','defendant','charge','court','opened_at','status','notes'],
});
