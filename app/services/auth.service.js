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
        const thisUser = await User.findByPk(userid);
        if (!thisUser) throw new BadRequestError('Invalid user');
        const payload = {
            id: thisUser.id,
            fullName: thisUser.fullName,
            email: thisUser.email,
            phone: thisUser.phone,
            role: thisUser.role,
            isActivated: thisUser.isActivated,
            isVerified: thisUser.isVerified,
            vendorMode: thisUser.vendorMode,
        };
        payload.website = mywebsite;
        payload.jti = uuidv4();

        if (storeId) payload.storeId = storeId;

        const returnobj = {
            accessToken: jwt.sign(payload, secret2, { expiresIn: accessTokenExpiry, algorithm: 'HS256' }),
        };

        if (!type) {
            // if type is not refresh
            returnobj.refreshToken = jwt.sign(payload, secret1, { expiresIn: refreshTokenExpiry, algorithm: 'HS256' });
        }
        // Save token to Redis with key as token and value as active
        redisClient.set(returnobj.accessToken, 'active', { EX: accessTokenExpiry, NX: true }); // 7 days
        if (returnobj.refreshToken) {
            redisClient.set(returnobj.refreshToken, 'active', { EX: refreshTokenExpiry, NX: true }); // 18 hours
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
