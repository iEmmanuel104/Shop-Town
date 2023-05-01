require('dotenv').config();

// Jwt configs
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '30d',
    accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '20d',
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
    API_SECRET = process.env.API_SECRET

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
API_URL = process.env.API_URL

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
    API_URL
}

    