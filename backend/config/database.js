const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load this project's .env first, then fall back to canonical OpenRouter env.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
