'use strict';

import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes, Dialect } from 'sequelize'
import { Pool } from 'pg';
import config from '../config/config';

const {development, testing, production} = config;
const basename: string = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const db: { [key: string]: any } = {};

let sequelize: Sequelize;
switch (env) {
  case 'production':
    // const isProduction: boolean = process.env.NODE_ENV === 'production';
    // const connectionString: any = isProduction ? process.env.DATABASE_URL : development;
//     const { DB_NAME, DB_HOST, DB_USER, DB_PASSWORD, DB_PORT } = process.env;
    // const pool = new Pool({
    //   // connectionString: connectionString,
    //   user: DB_USER,
    //   host: DB_HOST,
    //   database: DB_NAME,
    //   password: DB_PASSWORD,
    // });
    sequelize = new Sequelize(
      production.database,
      production.username,
      production.password,
     {
       host: production.host,
      dialect: 'postgres' as Dialect,
      protocol: 'postgres',
      logging: false,
      dialectOptions: 
        production.dialectOptions
        // ssl: {
        //   require: true,
        //   rejectUnauthorized: false
        // }
      
    }); 
    break;
  case 'test':
    sequelize = new Sequelize(
      testing.database,
      testing.username,
      testing.password,
      {
        host: testing.host,
        dialect: testing.dialect as Dialect,
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
      development.database,
      development.username,
      development.password,
      {
        host: development.host,
        dialect: 'postgres' as Dialect, 
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        }, 
        logging: false,
        dialectOptions: development.dialectOptions,
      }
    );
}

sequelize.addHook('beforeCount', function (this: any, options: any) {
  if (this._scope.include && this._scope.include.length > 0) {
    options.distinct = true
    options.col = this._scope.col || options.col || `"${this.options.name.singular}".id`
  }

  if (options.include && options.include.length > 0) {
    options.include = null
  }
})

// add hook to sort all queries by updatedAt to return newest first
sequelize.addHook('beforeFind', function (this: any, options: any) {
  if (options.attributes && (options.attributes.updatedAt || options.attributes.createdAt)) {
    if (!options.order) {
      options.order = [
        [
          Sequelize.literal('(CASE WHEN "updatedAt" IS NULL THEN "createdAt" ELSE "updatedAt" END)'),
          'DESC'
        ]
      ];
    }
  }
});


// add hook to  remove whitespaces from all string attributes
sequelize.addHook('beforeValidate', function (instance: any) {
  if (instance && instance.dataValues) {
    Object.keys(instance.dataValues).forEach((key: string) => {
      if (typeof instance.dataValues[key] === 'string') {
        instance.dataValues[key] = instance.dataValues[key].trim();
      }
    });
  }
});

fs
  .readdirSync(__dirname)
  .filter((file: string) => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach( (file: string) => {
    const models = require(path.join(__dirname, file))(sequelize, DataTypes);
    Object.keys(models).forEach((modelName: string) => {
      db[modelName] = models[modelName];
      // const modelDefiner = models[modelName];
      // db[modelName] = modelDefiner(sequelize, DataTypes);
    });
  });


Object.keys(db).forEach(modelName => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
