const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const asyncWrapper = require("../middlewares/async");
const { User } = require("../../models");
const { BadRequestError, JsonWebTokenError, TokenExpiredError } = require("../utils/customErrors");
const { refreshTokenExpiry, accessTokenExpiry, mywebsite, secret1, secret2} = require('../utils/configs');
const errorHandler = require("../middlewares/error-handler");

const issueToken = async (userid, storeId) => {
    try {
        const this_user = await User.findByPk(userid)
        if (!this_user) throw new BadRequestError('Invalid user')
        const payload = {
            id: this_user.id,
            fullName: this_user.fullName,
            email: this_user.email,
            role: this_user.role,
            isActivated: this_user.isActivated,
            vendorMode: this_user.vendorMode
        }
        payload.website = mywebsite;
        payload.jti = uuidv4();

        // let access_expiry = accessTokenExpiry
        //  refresh_expiry = refreshTokenExpiry
        
        // if (this_user.isActivated === false) {
            //     access_expiry = 1800 ? 1800 : accessTokenExpiry
            //     refresh_expiry = 3600 ? 3600 : refreshTokenExpiry
            // }
            
            console.log(accessTokenExpiry, refreshTokenExpiry)
        if (storeId) payload.storeId = storeId

        const access_token = jwt.sign(payload, secret2, { expiresIn: accessTokenExpiry, algorithm: 'HS256' });
        const refresh_token = jwt.sign(payload, secret1, { expiresIn: refreshTokenExpiry, algorithm: 'HS256' });
        return { access_token, refresh_token }
    } catch (error) {
        throw new Error(error);
    }
};

const decodeJWT = async (token, type) => {
    try {     
        let secret, expiry
        switch (type) {
            case 'refresh':
                secret = secret1
                break
            default:
                secret = secret2
        }
    
        const decoded = jwt.verify(token, secret);
        return decoded;
            
    } catch (error) {
        console.log(error)
        if (error instanceof jwt.TokenExpiredError) {
            throw new TokenExpiredError('Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new JsonWebTokenError('Invalid token');
        }
        throw error
    }
        
}


module.exports = {
    issueToken,
    decodeJWT
};
