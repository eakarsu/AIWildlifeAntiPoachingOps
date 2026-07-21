'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const pool = require('../config/database');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(password, salt, 32).toString('hex')}`;
}

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('Explicit bootstrap acknowledgement is required.');
  }
  const email = String(process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PROVISION_ADMIN_PASSWORD || '');
  const name = String(process.env.PROVISION_ADMIN_NAME || '').trim();
  if (!email || !name || password.length < 12) {
    throw new Error('Admin email, name, and a 12+ character password are required.');
  }
  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
  if (existing.rows.length) {
    console.log('Initial admin already exists; credentials were not changed.');
    return;
  }
  await pool.query(
    `INSERT INTO users(email, password, name, role) VALUES($1, $2, $3, 'admin')`,
    [email, hashPassword(password), name]
  );
  console.log('Initial wildlife administrator created.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
