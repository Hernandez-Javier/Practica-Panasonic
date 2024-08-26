// configuracion a db
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_user,
  host: process.env.DB_host,
  database: process.env.DB_name,
  password: process.env.DB_pass,
  port: process.env.DB_port,
});

module.exports = pool;