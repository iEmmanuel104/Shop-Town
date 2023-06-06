import dotenv from 'dotenv';

dotenv.config();

interface Database {
  database: string;
  username: string;
  password: string;
  host: string;
  dialect: string;
  dialectOptions?: {
    socketPath?: string;
    ssl?: boolean;
    version?: string;
  };
}

const development: Database = {
  database: process.env.PG_DATABASE!,
  username: process.env.PG_USERNAME!,
  password: process.env.PG_PASSWORD!,
  host: process.env.PG_HOST!,
  dialect: 'postgres',
  dialectOptions: {
      ssl: false,
      version: '15.1'
    },
};

const testing: Database = {
  database: process.env.PG_TEST_DATABASE!,
  username: process.env.PG_USERNAME!,
  password: process.env.PG_PASSWORD!,
  host: process.env.PG_HOST!,
  dialect: 'postgres'
};

const production: Database = {
  database: process.env.DB_NAME!,
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  host: process.env.DB_HOST!,
  dialect: 'postgres',
  dialectOptions: {
    "socketPath": process.env.DB_HOST
  }
};

export default {
  development,
  testing,
  production
};
