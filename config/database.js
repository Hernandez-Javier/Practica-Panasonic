// configuracion a db
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Bodega_Panasonic',
  password: process.env.DB_pass,
  port: 5432,
});

module.exports = pool;