const { User, Token, Password, BlacklistedTokens } = require ('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

require('dotenv').config();
const asyncWrapper = require('../middlewares/async');
const { generateCode } = require('../utils/StringGenerator');
const { sendverificationEmail, sendForgotPasswordEmail } = require('../utils/mailTemplates');
const { issueToken, decodeJWT } = require('../utils/auth.service');
const { getGoogleAuthUrl, getGoogleUser } = require('../utils/google.service');


const SignUp = asyncWrapper(async (req, res, next) => {
    const {  email, firstName, lastName, phone, password } = req.body;
    if ( !email | !firstName | !lastName | !terms)  return next(new BadRequestError('Please fill all required fields'));

    const user = await User.create({
        email,
        firstName,
        lastName,
        terms: "on", 
        role: "guest",
        phone
    });

    if (!user) return next(new BadRequestError('User not created'));

    let code = await generateCode()
    console.log('verifycode', code)

    await Token.create({ userId: user.id, verificationcode: code })    
    console.log(user.email)

    await Password.create({ id: user.id, password: password })

    await sendverificationEmail(user.email, code)

    
    const {access_token} = await issueToken(user.id)
    console.log('access_token', access_token)

    res.status(201).json({
        success: true,
        message: 'User created successfully, check your email for verification code',
        access_token
    });
});

const verifyEmail = asyncWrapper(async (req, res, next) => {
    const { code } = req.body
    const autho = req.headers.authorization

    if (!autho) return next(new BadRequestError('Invalid authorization'))

    const authtoken = autho.split(' ')[1]
    const decoded = decodeJWT(authtoken)

    const userId = decoded.id

    const token = await Token.findOne({ where: { verificationcode: code } })

    if (!token) return next(new BadRequestError('Invalid verification code'))

    if (token.userId !== userId) return next(new BadRequestError('Unauthorized'))

    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid verification code'))
    user.isActivated = true

    await user.save()
    await token.destroy()

    res.status(200).json({
        success: true,
        message: 'User Email verified successfully',
    });
});

const resendVerificationCode = asyncWrapper(async (req, res, next) => {
    const { userId } = req.body

    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid user'))

    let code = await generateCode()
    console.log('verifycode', code)

    await Token.create({ userId: user.id, verificationcode: code })
    await sendverificationEmail(user, code)
    console.log('verification email sent')

    res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
    });
});

const profileOnboarding = asyncWrapper(async (req, res, next) => {
    const { userId, location } = req.body
    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid user'))
    user.address = location
    
    await user.save()
     res.status(200).json({ 
        success: true,
        message: 'User profile updated successfully',
    });
});

const forgotPassword = asyncWrapper(async (req, res, next) => {

    const data = req.body.email ? { email: req.body.email }
        : req.body.phone ? { phone: req.body.phone }
            : next(new BadRequestError('Please provide email or phone'));

    const user = await User.findOne({ where: data });

    if (!user) return next(new BadRequestError('No user found'))

    const haspassword = await Password.findOne({ where: { id: user.id } })

    if (!haspassword) return next(new BadRequestError('User has no prior password set, please sign up'))

    let code = await generateCode()
    console.log('verifycode', code)
    await sendForgotPasswordEmail (user.email, code)

    const { access_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: "Proceed to reset password",
        access_token
    });
});

const resetPassword = asyncWrapper(async (req, res, next) => {
    const { password } = req.body
    const autho = req.headers.authorization
    if (!autho) return next(new BadRequestError('Invalid authorization'))
    const authtoken = autho.split(' ')[1]

    const decoded = decodeJWT(authtoken)
    const userId = decoded.id
    
    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    const haspassword = await Password.findOne({ where: { id: user.id } })

    if (!haspassword) return next(new BadRequestError('User has no prior password set'))
    haspassword.password = password
    await haspassword.save()
    
    // blacklist token
    await BlacklistedTokens.create({ token: authtoken })

    res.status(200).json({
        success: true,
        message: "Password reset successful",
    });
});

const signIn = asyncWrapper(async (req, res, next) => {
    const { password } = req.body;

    const data = req.body.email ? { email: req.body.email } 
                : req.body.phone ? { phone: req.body.phone } 
                : next(new BadRequestError('Please provide email or phone'));

    const user = await User.findOne({ where: data });
    if (!user) return next(new BadRequestError('Invalid user'));

    const passwordInstance = await Password.findOne({ where: { id: user.id } });
    if (!passwordInstance) {
        return next(new BadRequestError('User has no prior password set'));
    }

    if (!passwordInstance.isValidPassword(password)) {
        return next(new BadRequestError('Invalid password'));
    }
    const { access_token, refresh_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: "Sign in successful",
        access_token,
        refresh_token
    });

});

const getloggedInUser = asyncWrapper(async (req, res, next) => {
    const autho = req.headers.authorization

    if (!autho) return next(new BadRequestError('Invalid authorization'))
    const authtoken = autho.split(' ')[1]
    // check if token is blacklisted    
    const isBlacklisted = await BlacklistedTokens.findOne({ where: { token: authtoken } })

    if (isBlacklisted) return next(new BadRequestError('Invalid authorization'))

    const decoded = decodeJWT(authtoken)

    const userId = decoded.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        user
    });
});

const getNewAccessToken = asyncWrapper(async (req, res, next) => {
    const { refresh_token } = req.body

    const decoded = decodeJWT(refresh_token, 'refresh')

    const userId = decoded.id
    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))
    const { access_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: "New access token retrieved successfully",
        access_token
    });
});

const googleCallback = asyncWrapper(async (req, res, next) => {
    const { code } = req.body
    const googleUser = await getGoogleUser(code)

    if (!googleUser) return next(new BadRequestError('No user found'))

    const [user, created] = await User.findOrCreate({
        where: { google_id: googleUser.google_id },
        defaults: {
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            email: googleUser.email,
            googleId: googleUser.google_id,
            isActivated: true,
            role: 'user',
            terms: 'on'
        }
    });

    const { access_token } = await issueToken(user.id)

    if (created) {
        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            access_token
        });
    }

    // add to req session
    req.session.user = user

    res.status(200).json({ 
        success: true,
        message: 'User signed in successfully',
        access_token
    });
});

const facebookauth = asyncWrapper(async (req, res, next) => {
    // Create or update the user in the database
    const { facebookId, email } = req.user;
    let user = await User.findOne({ where: { email } });

    if (!user) {
        user = await User.create({ email, facebookId });
    } else {
        user.facebookId = facebookId;
        await user.save();
    }

    // Generate a JWT token for authentication
    const { access_token, refresh_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: 'User signed in successfully',
        access_token,
        refresh_token
    });
});


module.exports = { 
    SignUp, 
    verifyEmail, 
    profileOnboarding,
    forgotPassword,
    resetPassword,
    getloggedInUser,
    getNewAccessToken,
    signIn,
    resendVerificationCode,
    googleCallback,
    // googleSignIn,
    facebookauth
 }


