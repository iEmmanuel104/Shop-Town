'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV
const Pool = require('pg').Pool
const db = {};
const config = require('../config/config.js')

let sequelize;
switch (env) {
  case 'production':
    const isProduction = process.env.NODE_ENV === 'production'
    // const connectionString = isProduction ? process.env.DATABASE_URL : config.development
    const pool = new Pool({
      // connect uing the database username password
      
    })
    sequelize = new Sequelize(
      config.production.database,
      config.production.username,
      config.production.password,
       {
      dialect: 'postgres',
      host: config.production.host,
      // protocol: 'postgres',
      logging: false,
      // dialectOptions: {
      //   ssl: {
      //     require: true,
      //     rejectUnauthorized: false
      //   }
      // }
    });
    break;
  case 'test':
    sequelize = new Sequelize(
      config.testing.database,
      config.testing.username,
      config.testing.password,
      {
        host: config.testing.host,
        dialect: config.testing.dialect,
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        },
        logging: false
      }
    );
    break;
  default:
    sequelize = new Sequelize(
      config.development.database,
      config.development.username,
      config.development.password,
      {
        host: config.development.host,
        dialect: config.development.dialect,
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        },
        logging: false
      }
    );
}

// add global hooks for count queries
sequelize.addHook('beforeCount', function (options) {
  if (this._scope.include && this._scope.include.length > 0) {
    options.distinct = true
    options.col = this._scope.col || options.col || `"${this.options.name.singular}".id`
  }

  if (options.include && options.include.length > 0) {
    options.include = null
  }
})

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const models = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    Object.keys(models).forEach(modelName => {
      db[modelName] = models[modelName];
    });
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});



db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;