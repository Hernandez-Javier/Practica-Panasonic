// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Bodega_Panasonic',
  password: 'admin',
  port: 5432,
});

module.exports = pool;