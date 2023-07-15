const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const asyncWrapper = require('../middlewares/async');
const { User } = require('../../models');
const { BadRequestError, JsonWebTokenError, TokenExpiredError, UnauthorizedError } = require('../utils/customErrors');
const { refreshTokenExpiry, accessTokenExpiry, mywebsite, secret1, secret2 } = require('../utils/configs');
const errorHandler = require('../middlewares/error-handler');
const redisClient = require('../utils/redis');

const issueToken = async ({ userid, storeId, type }) => {
    try {
        const this_user = await User.findByPk(userid);
        if (!this_user) throw new BadRequestError('Invalid user');
        const payload = {
            id: this_user.id,
            fullName: this_user.fullName,
            email: this_user.email,
            phone: this_user.phone,
            role: this_user.role,
            isActivated: this_user.isActivated,
            isVerified: this_user.isVerified,
            vendorMode: this_user.vendorMode,
        };
        payload.website = mywebsite;
        payload.jti = uuidv4();

        if (storeId) payload.storeId = storeId;

        let returnobj = {
            access_token: jwt.sign(payload, secret2, { expiresIn: accessTokenExpiry, algorithm: 'HS256' }),
        };

        if (!type) {
            // if type is not refresh
            returnobj.refresh_token = jwt.sign(payload, secret1, { expiresIn: refreshTokenExpiry, algorithm: 'HS256' });
        }
        // Save token to Redis with key as token and value as active
        redisClient.set(returnobj.access_token, 'active', { EX: accessTokenExpiry, NX: true }); // 7 days
        if (returnobj.refresh_token) {
            redisClient.set(returnobj.refresh_token, 'active', { EX: refreshTokenExpiry, NX: true }); // 18 hours
        }

        return returnobj;
    } catch (error) {
        throw new Error(error);
    }
};

const decodeJWT = async (token, type) => {
    try {
        let secret, expiry;
        switch (type) {
            case 'refresh':
                secret = secret1;
                break;
            default:
                secret = secret2;
        }

        // Check if token is blacklisted in Redis cache
        const redisValue = await redisClient.get(token);
        if (redisValue === 'blacklisted') {
            throw new UnauthorizedError('Unauthorized token');
        }

        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new TokenExpiredError('Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new JsonWebTokenError('Invalid token');
        }
        throw error;
    }
};

module.exports = {
    issueToken,
    decodeJWT,
};
