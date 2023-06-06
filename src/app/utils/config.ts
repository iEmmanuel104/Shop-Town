import dotenv from 'dotenv'
dotenv.config()

/* PORT */
const PORT = process.env.PORT


/* JWT TOKENS */
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXP = process.env.JWT_ACCESS_EXP,
    JWT_REFRESH_EXP = process.env.JWT_REFRESH_EXP

/* EMAIL and OAUTH2*/
const EMAIL_HOST = process.env.EMAIL_HOST,
    EMAIL_PORT = process.env.EMAIL_PORT,
    EMAIL_HOST_ADDRESS = process.env.EMAIL_HOST_ADDRESS,
    OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET,
    OAUTH_REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN,
    OAUTH_ACCESS_TOKEN = process.env.OAUTH_ACCESS_TOKEN,
// GOOGLE_SIGNIN_CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID,
    SUPER_ADMIN_EMAIL1 = process.env.SUPER_ADMIN_EMAIL1
// SUPER_ADMIN_EMAIL2 = process.env.SUPER_ADMIN_EMAIL2

// GOOGLE CLOUD STORAGE
// const { PROJECT_ID, BUCKET_NAME, KEY_FILE_PATH } = process.env;
const PROJECT_ID = process.env.PROJECT_ID,
    BUCKET_NAME = process.env.BUCKET_NAME,
    KEY_FILE_PATH = process.env.KEY_FILE_PATH



/* DB Connection -- PostgreSQL */
const DATABASE = {
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
}

/* Website URL */
const WEBSITE_URL = process.env.WEBSITE_URL
const BASE_ROUTE = process.env.BASE_ROUTE

/* Mixpanel*/
const MIXPANEL_TOKEN= process.env.MIXPANEL_PROJECT_TOKEN

export default  {
    PORT,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ACCESS_EXP,
    JWT_REFRESH_EXP,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_HOST_ADDRESS,
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REFRESH_TOKEN,
    OAUTH_ACCESS_TOKEN,
    // GOOGLE_SIGNIN_CLIENT_ID,
    DATABASE,
    BASE_ROUTE,
    SUPER_ADMIN_EMAIL1,
    // SUPER_ADMIN_EMAIL2,
    WEBSITE_URL,
    PROJECT_ID,
    BUCKET_NAME,
    KEY_FILE_PATH,
    MIXPANEL_TOKEN
}
