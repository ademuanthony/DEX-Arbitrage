const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DBUSER,
  host: process.env.DBHOST,
  database: process.env.DBNAME,
  password: process.env.DBPASS,
  port: process.env.DBPORT,
});

module.exports = { dbPool: pool };
