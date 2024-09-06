// configuracion a db
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_user,
  host: process.env.DB_host,
  database: process.env.DB_name,
  password: process.env.DB_pass,
  port: process.env.DB_port,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;