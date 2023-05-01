const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const asyncWrapper = require("../middlewares/async");
const { User } = require("../../models");
const { BadRequestError } = require("./customErrors");
const {refreshTokenExpiry,accessTokenExpiry,mywebsite,secret1,secret2} = require('./configs')

const issueToken = async (userid) => {
    try {
        const this_user = await User.findByPk(userid)
        if (!this_user) return next(new BadRequestError('Invalid user'))
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

        console.log("payload", payload)

        const access_token = jwt.sign(payload, secret2, { expiresIn: accessTokenExpiry, algorithm: 'HS256' });
        const refresh_token = jwt.sign(payload, secret1, { expiresIn: refreshTokenExpiry, algorithm: 'HS256' });
        console.log("access_token", access_token)
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

        const decoded = jwt.verify(token, secret)
        return decoded
    } catch (error) {
        throw new Error(error);
    }
}


module.exports = {
    issueToken,
    decodeJWT
};
