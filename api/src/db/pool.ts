

import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  options: `-c search_path="${config.database.schema}",public`,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  ssl: config.database.ssl
    ? { rejectUnauthorized: true }
    : false,
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error);
});
