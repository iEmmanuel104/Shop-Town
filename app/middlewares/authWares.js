const { User, Token, BlacklistedTokens } = require('../../models')
const { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } = require('../utils/customErrors')
const { issueToken, decodeJWT } = require('../services/auth.service')

const asyncWrapper = require('../middlewares/async')

const basicAuth = asyncWrapper(async (req, res, next) => { 
    const autho = req.headers.authorization
    if (!autho) return next(new BadRequestError('No authorization header found'))
    
    const authtoken = autho.split(' ')[1]
    console.log('authtoken')
    const decoded = await decodeJWT(authtoken)
    if (!decoded) return next(new BadRequestError('Invalid authorization'))

    // check if token is blacklisted
    const isBlacklisted = await BlacklistedTokens.findOne({ where: { token: authtoken } })
    if (isBlacklisted) return next(new BadRequestError('Unauthorised Token'))
    if (decoded.storeId) {
        console.log('store id found', decoded.storeId)
    }

    req.decoded = decoded
    console.log('decoded from basicAuth', decoded)
    next()
    
})

const authenticate =  async (socket) => {
    try {
        const token = socket.handshake.query?.access_token;
        if (!token) {
            throw new Error('Authentication token not provided')
        }

        const decoded = await decodeJWT(token);
        const user_doc = await User.findByPk(decoded.id)
        // get plain object
        const user = user_doc?.get({ plain: true })

        socket.user = user;

        return socket
    } catch (err) {
        console.log(err)
        return err
    }
}



module.exports = { basicAuth, authenticate }

