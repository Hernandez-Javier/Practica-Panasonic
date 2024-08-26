// configuracion a db
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_user,
  host: process.env.DB_host,
  database: 'panasonicss',
  password: process.env.DB_pass,
  port: 5432,
});

module.exports = pool;