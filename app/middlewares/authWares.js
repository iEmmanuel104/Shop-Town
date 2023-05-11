const { User, Token, BlacklistedTokens } = require('../../models')
const { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } = require('../utils/customErrors')
const { issueToken, decodeJWT } = require('../utils/auth.service')

const asyncWrapper = require('../middlewares/async')

const basicAuth = asyncWrapper(async (req, res, next) => { 
    const autho = req.headers.authorization
    if (!autho) return next(new BadRequestError('No authorization header found'))
    
    const authtoken = autho.split(' ')[1]
    const decoded = await decodeJWT(authtoken)
    if (!decoded) return next(new BadRequestError('Invalid authorization'))

    // check if token is blacklisted
    const isBlacklisted = await BlacklistedTokens.findOne({ where: { token: authtoken } })
    if (isBlacklisted) return next(new BadRequestError('Unauthorised Token'))
    
    req.decoded = decoded
    next()
    
})

module.exports = { basicAuth }

