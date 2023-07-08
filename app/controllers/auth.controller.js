const { User, Token, Password, BlacklistedTokens, Brand, DeliveryAddress, Cart, Wallet } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { uploadSingleFile } = require('../services/imageupload.service');
const { LOGO, accessTokenExpiry } = require('../utils/configs');
const { generateWallet, createCart } = require('../services/wallet.service');
const { sequelize, Sequelize } = require('../../models');
const Op = Sequelize.Op;
require('dotenv').config();
const asyncWrapper = require('../middlewares/async');
const { generateCode } = require('../utils/StringGenerator');
const { sendverificationEmail, sendForgotPasswordEmail } = require('../utils/mailTemplates');
const { issueToken, decodeJWT } = require('../services/auth.service');
const { validateAddress } = require('../services/shipbubble.service');
const { phoneNumberLookup } = require('../services/sms.service');
const { UUID } = require('sequelize');
const { randomUUID } = require('crypto');
const redisClient = require('../utils/redis');


const signUp = asyncWrapper(async (req, res, next) => {
    const { email, firstName, lastName, phone, password, location, city, state, country } = req.body;
    if (!email | !firstName | !lastName | !location | !city | !state) return next(new BadRequestError('Please fill all required fields'));

    let access_token, address_code;
    const addressdetails = location + ',' + city + ',' + state + ',' + country,
        details = {
            name: firstName + ' ' + lastName,
            email: email,
            phone: phone,
            address: addressdetails,
        }
    address_code = await validateAddress(details)

    const user = await User.create({
        email, firstName, lastName, terms: "on", role: "guest", phone
    });

    console.log('user address code', address_code)

    await Promise.all([
        Password.create({ userId: user.id, password: password }),
        // create new address in address table
        DeliveryAddress.create({
            userId: user.id,
            address: location,
            city: city,
            state: state,
            country: country,
            type: 'home',
            phone: phone ? user.phone : user.phone,
            addressCode: address_code,
            isDefault: true
        }),
        access_token = (await issueToken({ userid: user.id })).access_token
    ]);

    return res.status(201).json({
        success: true,
        message: 'User created successfully, check your email for verification code',
        access_token
    });
});

const verifyEmail = asyncWrapper(async (req, res, next) => {
    const { code } = req.body;
    const { decoded } = req;
    const { id: userId, isVerified } = decoded;

    if (isVerified) {
        return next(new BadRequestError('User already verified, please login'));
    }

    const token = await Token.findOne({ where: { userId } });
    console.log('token ====', token)

    if (token.verificationCode !== code) {
        return next(new BadRequestError('Invalid verification code'));
    }

    await User.update({
        isVerified: true,
    }, { where: { id: userId } });

    await Promise.all([
        generateWallet({ id: userId, type: 'customer' }),
        createCart(userId),
        token.update({ verificationCode: null })
    ]);

    return res.status(200).json({
        success: true,
        message: 'User Email verified successfully',
    });
});

const resendVerificationCode = asyncWrapper(async (req, res, next) => {
    // const { userId } = req.body
    const payload = req.decoded
    const userId = payload.id

    if (payload.isVerified) return next(new BadRequestError('User already verified'))

    const user = await User.findByPk(userId);
    if (!user) {
        return next(new NotFoundError('User not found'));
    }

    const code = await user.generateAndSendVerificationCode('verify');


    return res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
    });
});

const profileOnboarding = asyncWrapper(async (req, res, next) => {
    const { location, city, state, country } = req.body
    const payload = req.decoded
    const userId = payload.id
    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid user'))

    // check if the user has a facebook or google id and add a phone number field 
    if (user.facebookId || user.googleId) {
        console.log('user has facebook or google id')
        user.phone = req.body.phone
        await user.save()
    }

    const addressdetails = location + ',' + city + ',' + state + ',' + country,
        details = {
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
            phone: user.phone,
            address: addressdetails,
        }
    const address_code = await validateAddress(details)
    // create new address in address table
    await DeliveryAddress.create({
        userId,
        address: location,
        city: city,
        state: state,
        country: country,
        phone: phone ? user.phone : user.phone,
        addressCode: address_code,
        isDefault: true
    })

    return res.status(200).json({
        success: true,
        message: 'User profile onboarding successful',
    });
});

const forgotPassword = asyncWrapper(async (req, res, next) => {

    await sequelize.transaction(async (t) => {
        const { email, phone } = req.body
        const data = email
            ? { email } : phone
                ? { phone } : next(new BadRequestError('Please provide email or phone'));

        const user = await User.findOne({ where: data });

        if (!user) return next(new BadRequestError('No user found'))

        const haspassword = await Password.findOne({ where: { userId: user.id } })
        let code;
        if (!haspassword) {
            console.log('user has no password')
            // create password
            await Password.create({ id: user.id, password: randomUUID() })
            code = await user.generateAndSendVerificationCode('forgot');
        } else {
            code = await user.generateAndSendVerificationCode('forgot');
        }

        return res.status(200).json({
            success: true,
            message: "Password reset code sent successfully, proceed to reset password",
            // access_token
        });
    })
});

const resetPassword = asyncWrapper(async (req, res, next) => {
    const { email, current_password, new_password } = req.body

    const { code } = req.query
    console.log(code)

    let passwordobj = {}
    const user = await User.findOne({ where: { email } })
    if (!user) {
        throw new BadRequestError(' Invalid password reset request')
    }

    if (req.query.code) {
        // offline reset -- new password and email in req , code in query
        const user_token = await Token.findOne({ where: { userId: user.id, passwordResetToken: code } })
        if (!user_token) {
            throw new BadRequestError('Invalid password reset code provided')
        }
        passwordobj = { password: new_password }
        // destroy token
        // await Token.destroy({ where: { userId: user.id } })
    } else if (current_password) {
        // online reset -- current password, new password and email in req body 
        const passwordInstance = await Password.findOne({ where: { id: user.id } });
        if (!passwordInstance) {
            return next(new BadRequestError('User has no prior password set'));
        }

        if (!passwordInstance.isValidPassword(current_password)) {
            return next(new BadRequestError('Invalid current password'));
        }
        passwordobj = { password: new_password }
    } else {
        throw new BadRequestError('Invalid password reset request')
    }

    await Password.update(passwordobj, { where: { userId: user.id } })

    return res.status(200).send({ success: true, message: 'Password Reset Successful' })
});

const signIn = asyncWrapper(async (req, res, next) => {
    const { password } = req.body;
    const data = req.body.email ? { email: req.body.email }
        : req.body.phone ? { phone: req.body.phone }
            : next(new BadRequestError('Please provide email or phone'));


    const user = await User.findOne({
        where: data,
        include: [
            { model: Cart, as: 'Cart', attributes: ['checkoutData'] },
            // { model: Wallet, as: 'Wallet', attributes: [] },
            { model: DeliveryAddress, where: { isDefault: true } },
        ]
    });

    if (!user) return next(new BadRequestError('Invalid user'));

    if (!user.isVerified || !user.isActivated) {
        user.generateAndSendVerificationCode('verify');

        return  res.status(422).json({ // 422 unprocessable entity 
            success: true,
            message: 'User not verified, verification code sent successfully',
            access_token
        });
    }

    const passwordInstance = await Password.findOne({ where: { userId: user.id } });
    if (!passwordInstance) {
        return next(new BadRequestError('User has no prior password set'));
    }

    if (!passwordInstance.isValidPassword(password)) {
        return next(new BadRequestError('Invalid user Credentials'));
    }
    console.log(user)

    const hasdefaultAddress = !!user.DeliveryAddresses[0]; // check if the user has a default address
    const hascheckoutData = !!user.Cart.checkoutData; // check if the user has checkout data

    let tokens;
    // check if the user has a store 
    const stores = await user.getBrands()
    if (stores.length > 0) {
        await user.update({ status: 'active', vendorMode: true });
        tokens = await issueToken({ userid: user.id, storeId: stores[0].id })
    } else {
        await user.update({ status: 'active' });
        tokens = await issueToken({ userid: user.id })
    }

    const { access_token, refresh_token } = tokens

    return res.status(200).json({
        success: true,
        message: "Sign in successful",
        // user,
        hasdefaultAddress,
        hascheckoutData,
        access_token,
        refresh_token
    });

});

const getloggedInUser = asyncWrapper(async (req, res, next) => {

    const payload = req.decoded

    const userId = payload.id

    const user = await User.scope('verified').findOne(
        {
            where: { id: userId },
            include: [
                {
                    model: Cart,
                    as: 'Cart',
                    attributes: { exclude: ['checkoutData'] },
                    include: [{
                        model: Cart,
                        as: 'Wishlists',
                        attributes: ['id'],
                    }]
                },
                { model: Wallet, attributes: ['amount'] },
                { model: DeliveryAddress, where: { isDefault: true } },
            ]
        }
    );
    if (!user) return next(new BadRequestError('Unverified user'))
    // get all stores associated with the user and extract only the id and name fields
    const stores = (await user.getBrands({
        attributes: ['id', 'name', 'logo', 'businessPhone', 'socials'],
        through: { attributes: ['role'] }
    })).map(store => ({
        id: store.id,
        name: store.name,
        role: store.UserBrand.role,
        logo: store.logo,
        phone: store.businessPhone,
        socials: store.socials
    }))

    return res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        user,
        stores: stores,
    });
});

const getNewAccessToken = asyncWrapper(async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        throw new BadRequestError('Invalid authorization');
    }

    const [, refresh_token] = authorization.split(' ');

    const { id: userId } = await decodeJWT(refresh_token, 'refresh');
    const user = await User.findByPk(userId);

    if (!user) {
        throw new BadRequestError('Invalid user');
    }

    const { access_token } = await issueToken({ userid: user.id, type: 'access' });

    return res.status(200).json({
        success: true,
        message: 'New access token retrieved successfully',
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
        user.status = "active"
        await user.save();
    }

    // Generate a JWT token for authentication
    const { access_token, refresh_token } = await issueToken({ userid: user.id })

    return res.status(200).json({
        success: true,
        message: 'User signed in successfully',
        access_token,
        refresh_token
    });
});

const googleSignIn = asyncWrapper(async (req, res, next) => {
    const { googleId, email } = req.user;

    let user = await User.findOne({ where: { email } });

    if (user.googleId !== googleId) {
        return next(new BadRequestError('Invalid user'));
    }
    user.status = "active"
    await user.save()

    // Generate a JWT token for authentication
    const { access_token, refresh_token } = await issueToken({ userid: user.id })

    return res.status(200).json({
        success: true,
        message: 'User signed in successfully',
        access_token,
        refresh_token
    });
});

const logout = asyncWrapper(async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        throw new BadRequestError('Invalid authorization');
    }

    const [, token] = authorization.split(' ');

    const { id: userId } = await decodeJWT(token);

    // Update user status to "inactive" in a single query
    await User.update({ status: 'inactive', vendorMode: true }, { where: { id: userId } });

    // Blacklist token in Redis cache
    // Check if token exists in Redis cache
    const tokenExists = await redisClient.exists(token);

    let redisExpiry;
    if (tokenExists) {
        redisExpiry = await redisClient.ttl(token);
        // delete token from Redis cache
        await redisClient.del(token);
    } else {
        // Use accessTokenExpiry value instead
        redisExpiry = accessTokenExpiry;
    }
    console.log('redis expiry time', redisExpiry);

    await redisClient.set(token, 'blacklisted', { KEEPTTL: true, XX: true });

    return res.status(200).json({
        success: true,
        message: 'User logged out successfully',
    });
});

const switchAccount = asyncWrapper(async (req, res, next) => {
    const payload = req.decoded
    const userId = payload.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    // switch the value of vendorMode
    user.vendorMode = !user.vendorMode // flip the boolean value

    // get all stores associated with the user and extract only the id and name fields
    const stores = (await user.getBrands({
        attributes: ['id', 'name'],
        through: { attributes: ['role'] }
    })).map(store => ({
        id: store.id,
        name: store.name,
        role: store.UserBrand.role
    }))

    // if there is no store associated with the user, return a message
    if (stores.length === 0) {
        return res.status(200).json({
            success: true,
            message: `User has no associated store, please create a store to switch to seller mode`,
        });
    }

    await user.save()

    const message = `User switched to ${user.vendorMode ? 'seller' : 'customer'} mode successfully`
    let responseData = {
        success: true,
        message,
    }

    if (user.vendorMode) {
        responseData.stores = stores
    }

    return res.status(200).json(responseData)

});

const selectStore = asyncWrapper(async (req, res, next) => {
    const payload = req.decoded
    const { storeId } = req.body

    const user = await User.findByPk(payload.id)
    if (!user) return next(new BadRequestError('Invalid user'))

    // check if user is associated with the store
    const store = await Brand.findByPk(storeId)
    if (!store) return next(new BadRequestError('Invalid store'))
    const isAssociated = await store.hasUser(user)
    if (!isAssociated) return next(new BadRequestError('Unauthorized'))

    let responseData = {
        success: true,
        message: `User switched to ${store.name} successfully`,
        data: store,
    }

    if (req.query.token === 'true') {
        const { access_token } = await issueToken({ userid: user.id, storeId })
        responseData.access_token = access_token
    }

    return res.status(200).json(responseData)
});

const registerStore = asyncWrapper(async (req, res, next) => {
    const { storeName, phone, email, industry, country, address, state, city, postal } = req.body;

    if (!storeName || !phone || !email || !industry || !country || !address || !state || !city) {
        return next(new BadRequestError('Please provide all required fields'));
    }

    // CHECK FOR VALID PHONE NUMBER using twilio
    // phoneNumberLookup({phone})
    const payload = req.decoded

    if (!payload.isVerified || !payload.isActivated) {
        return next(new BadRequestError('Please verify your account to create a store'));
    }
    checkemail = email.trim().toLowerCase()
    checkstoreName = storeName.trim().toLowerCase()
    const existingStore = await Brand.findOne({
        where: {
            [Op.or]: [
                { businessEmail: checkemail },
                { name: checkstoreName },
            ],
        },
        attributes: ['businessEmail', 'name'],
    });

    if (existingStore) {
        const errorMessage = `A Store with this ${existingStore.businessEmail === checkemail ? 'Email' : 'Name'} already exists`;
        return next(new BadRequestError(errorMessage));
    }


    const address_code = await validateAddress({
        name: checkstoreName, 
        email,
        phone,
        address: `${address},${city},${state},${country}`
    })

    let url;
    if (req.file) {
            url = await uploadSingleFile(req.file, { user: `Stores/${checkstoreName}`, folder: `Images` })
    }

    // Create store, add user, and create new address using bulkCreate
    const createdStore = await Brand.create({
        name: storeName,        city: city,
        businessPhone: phone,   businessEmail: email,
        industry: industry,     country: country,
        address,                state,
        owner: payload.id,      
        // logo: LOGO
        logo: url ? url : LOGO,
    });

    const [storeuser, deliveryAddress] = await Promise.all([

        createdStore.addUser(payload, { through: { role: 'owner' } }),

        DeliveryAddress.create({
            storeId: createdStore.id,
            address, 
            city,
            state,
            country,
            phone,
            addressCode: address_code,
            isDefault: true,
        })
    ]);

    return res.status(200).json({
        success: true,
        message: 'Store created successfully',
        store: createdStore
    });
});

module.exports = {
    signUp, verifyEmail,
    profileOnboarding, forgotPassword,
    resetPassword, getloggedInUser,
    getNewAccessToken, signIn,
    resendVerificationCode, googleSignIn,
    facebookauth, logout,
    switchAccount, registerStore,
    selectStore
}