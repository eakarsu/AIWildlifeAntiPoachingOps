const buildCrud = require('./_crudFactory');

// Exports a factory so server.js can inject the onCreated hook (notifications + webhook).
module.exports = (onCreated) => buildCrud({
  table: 'poacher_incidents',
  fields: ['incident_id','location','type','severity','opened_at','status','notes'],
  webhookPrefix: 'incident',
  onCreated,
});
