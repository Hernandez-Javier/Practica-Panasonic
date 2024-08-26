// configuracion a db
const { Pool } = require('pg');

const pool = new Pool({
  user: 'ssadmin',
  host: 'cr6237bqf0us739u8f4g-a.oregon-postgres.render.com',
  database: 'panasonicss',
  password: 'LgLEFAqW9tiep8oacIHV66khJe9shL5O',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;