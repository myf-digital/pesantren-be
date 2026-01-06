'use strict';

require('dotenv').config();

module.exports = {
  production: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'database',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  development: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'database',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
