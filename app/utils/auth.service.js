const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');

const refreshTokenExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);
const accessTokenExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);
const adminRefreshTokenExpiry = parseInt(process.env.ADMIN_REFRESH_TOKEN_EXPIRY);
const adminAccessTokenExpiry = parseInt(process.env.ADMIN_ACCESS_TOKEN_EXPIRY);
const mywebsite = process.env.MY_WEBSITE;
const secret = process.env.REFRESH_TOKEN_JWT_SECRET
const secret2 = process.env.ACCESS_TOKEN_JWT_SECRET
const adminsecret = process.env.ADMIN_REFRESH_TOKEN_JWT_SECRET
const adminsecret2 = process.env.ADMIN_ACCESS_TOKEN_JWT_SECRET

const authService = () => {
  const issue_RefreshToken = payload => {
    payload.website = mywebsite;
    payload.jti = uuidv4();
    return jwt.sign(payload, secret, { expiresIn: refreshTokenExpiry, algorithm: 'HS256' });
  };
  const verify_RefreshToken = (token, cb) => jwt.verify(token, secret, { algorithms: ['HS256'] }, cb);

  const issue_AccessToken = payload => {
    payload.website = mywebsite;
    payload.jti = uuidv4();
    return jwt.sign(payload, secret2, { expiresIn: accessTokenExpiry, algorithm: 'HS256' });
  };
  const verify_AccessToken = (token, cb) => jwt.verify(token, secret2, { algorithms: ['HS256'] }, cb);

  const issue_AdminRefreshToken = payload => {
    payload.website = mywebsite;
    payload.jti = uuidv4();
    return jwt.sign(payload, adminsecret, { expiresIn: adminRefreshTokenExpiry, algorithm: 'HS256' });
  };
  const verify_AdminRefreshToken = (token, cb) => jwt.verify(token, adminsecret, { algorithms: ['HS256'] }, cb);

  const issue_AdminAccessToken = payload => {
    payload.website = mywebsite;
    payload.jti = uuidv4();
    return jwt.sign(payload, adminsecret2, { expiresIn: adminAccessTokenExpiry, algorithm: 'HS256' });
  };
  const verify_AdminAccessToken = (token, cb) => jwt.verify(token, adminsecret2, { algorithms: ['HS256'] }, cb);

  return {
    issue_RefreshToken,
    verify_RefreshToken,
    issue_AccessToken,
    verify_AccessToken,
    issue_AdminRefreshToken,
    verify_AdminRefreshToken,
    issue_AdminAccessToken,
    verify_AdminAccessToken
  };
};


module.exports = authService;
