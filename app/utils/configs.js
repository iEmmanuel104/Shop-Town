require('dotenv').config();

// Jwt configs
const refreshTokenExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY) || 31536000,
    accessTokenExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY) || 15811200,
    mywebsite = process.env.MY_WEBSITE || 'http://localhost:3000',
    secret1 = process.env.REFRESH_TOKEN_JWT_SECRET,
    secret2 = process.env.ACCESS_TOKEN_JWT_SECRET

// EMAIL CONIFGS
const EMAIL_HOST_ADDRESS = process.env.EMAIL_HOST_ADDRESS,
    OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET,
    OAUTH_REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN,
    OAUTH_ACCESS_TOKEN = process.env.OAUTH_ACCESS_TOKEN,
    GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET,
    SESSION_SECRET = process.env.SESSION_SECRET,

    // CLOUDINARY CONFIGS
    CLOUD_NAME = process.env.CLOUD_NAME,
    API_KEY = process.env.API_KEY,
    API_SECRET = process.env.API_SECRET,

    // SENDGRID CONFIGS
    SENDGRID_API_KEY = process.env.SENDGRID_API_KEY,

    // STRIPE CONFIGS

    // FLUTTERWAVE CONFIGS
    FLW_SECRET_KEY = process.env.FLW_SECRET_KEY,
    FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY,
    FLW_REDIRECT_URL = process.env.FLW_REDIRECT_URL,
    LOGO = process.env.LOGO,

    // PAYSTACK CONFIGS

    // FACEBOOK CONFIGS
    FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET,
    API_URL = process.env.API_URL,

    // KSECURE FEE
    KSECURE_FEE = process.env.KSECURE_FEE,

    // TWILIO CONFIGS
    TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_SERVICE_SID = process.env.TWILIO_PHONE_SERVICE_SID,

    // REDIS CLIENT
    REDIS_CONNECTION_URL = process.env.REDIS_CONNECTION_URL,

    // Shipbubble credentials
    SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY

    //SEERBIT CONFIGS
    SEERBIT_PUBLIC_KEY = process.env.SEERBIT_PUBLIC_KEY,
    SEERBIT_SECRET_KEY = process.env.SEERBIT_SECRET_KEY,
    SEERBIT_REDIRECT_URL = process.env.SEERBIT_REDIRECT_URL


    module.exports = {
        refreshTokenExpiry,
        accessTokenExpiry,
        mywebsite,
        secret1,
        secret2,
        EMAIL_HOST_ADDRESS,
        OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET,
        OAUTH_REFRESH_TOKEN,
        OAUTH_ACCESS_TOKEN,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        SESSION_SECRET,
        CLOUD_NAME,
        SENDGRID_API_KEY,
        API_KEY,
        API_SECRET,
        FLW_SECRET_KEY,
        FLW_PUBLIC_KEY,
        FLW_REDIRECT_URL,
        LOGO,
        FACEBOOK_APP_ID,
        FACEBOOK_APP_SECRET,
        API_URL,
        KSECURE_FEE,
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        REDIS_CONNECTION_URL,
        TWILIO_PHONE_SERVICE_SID,
        SHIPBUBBLE_API_KEY,
        SEERBIT_PUBLIC_KEY,
        SEERBIT_SECRET_KEY,
        SEERBIT_REDIRECT_URL
    }

