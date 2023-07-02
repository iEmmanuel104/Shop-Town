require('dotenv').config();

const development = {

  database: process.env.PG_DATABASE,
  username: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  dialect: 'postgres',
  dialectOptions: {
    ssl: false,
    version: '15.1'
  },
};

const testing = {
  database: 'databasename',
  username: 'username',
  password: 'password',
  host: 'localhost',
  dialect: 'sqlite'
};

const production = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: 'postgres',
  dialectOptions: {
    "socketPath": process.env.DB_HOST
  }
};
const render = {
  database: process.env.G_DB_NAME,
  username: process.env.G_DB_USER,
  password: process.env.G_DB_PASSWORD,
  host: process.env.G_DB_HOST,
  dialect: 'postgres',
  dialectOptions: {
    "socketPath": process.env.G_DB_HOST
  }
};


module.exports = {
  development,
  testing,
  production,
  render
};
