const { User, Token, Password, BlacklistedTokens, Brand, DeliveryAddress, Cart, Wallet } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { uploadSingleFile } = require('../services/imageupload.service');
const { LOGO } = require('../utils/configs');
const { generateWallet, createCart } = require('../services/wallet.service');
const { sequelize, Sequelize } = require('../../models');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async');
const { generateCode } = require('../utils/StringGenerator');
const { sendverificationEmail, sendForgotPasswordEmail } = require('../utils/mailTemplates');
const { issueToken, decodeJWT } = require('../services/auth.service');
const { validateAddress } = require('../services/shipbubble.service');
const { phoneNumberLookup } = require('../services/sms.service');
const { UUID } = require('sequelize');
const { randomUUID } = require('crypto');

const signUp = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        let { email, firstName, lastName, phone, password } = req.body;
        if (!email | !firstName | !lastName) return next(new BadRequestError('Please fill all required fields'));
        // remove white spaces from req.body values make email lowercase
        email = email.trim().toLowerCase();
        firstName = firstName.trim();
        lastName = lastName.trim();
        phone = phone.trim();
        password = password.trim();

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

        await Token.create({ userId: user.id, verificationCode: code }, { transaction: t })

        await Password.create({ id: user.id, password: password }, { transaction: t })

        let options = {
            email: user.email,
            phone: user.phone,
        }

        const { access_token } = await issueToken(user.id)

        await sendverificationEmail(options, code)

        res.status(201).json({
            success: true,
            message: 'User created successfully, check your email for verification code',
            access_token
        });
    });
});

const verifyEmail = asyncWrapper(async (req, res, next) => {
    const { code } = req.body

    const payload = req.decoded
    if (payload.isActivated === true) return next(new BadRequestError('User already verified, please login'))

    // console.log('decoded', decoded)
    const userId = payload.id
    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    const token = await Token.findOne({ where: { verificationCode: code } })

    if (!token) return next(new BadRequestError('Invalid verification code'))

    if (token.userId !== userId) return next(new BadRequestError('Unauthorized'))

    // update user isActivated to true
    await User.update({ isActivated: true }, { where: { id: userId } })

    // console.log('updatedUser', updatedUser)

    const wallet = {
        id: user.id,
        type: 'customer'
    }
    await generateWallet(wallet)
    await createCart(user.id)

    await token.destroy()

    res.status(200).json({
        success: true,
        message: 'User Email verified successfully',
    });
});

const resendVerificationCode = asyncWrapper(async (req, res, next) => {
    // const { userId } = req.body
    const payload = req.decoded
    const userId = payload.id

    if (payload.isActivated) return next(new BadRequestError('User already verified'))

    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid user'))

    let code = await generateCode()

    await Token.create({ userId: user.id, verificationCode: code })
    let options = {
        email: user.email,
        phone: user.phone,
    }
    await sendverificationEmail(options, code)

    res.status(200).json({
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

    user.address = location
    await user.save()

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

    res.status(200).json({
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

        const haspassword = await Password.findOne({ where: { id: user.id } })

        if (!haspassword) {
            // create password
            await Password.create({ id: user.id, password: randomUUID() })
        }

        let code = await generateCode()

        await Token.create({ userId: user.id, verificationCode: code }, { transaction: t })
        let options = {
            email: user.email,
            phone: user.phone,
        }
        await sendForgotPasswordEmail(options, code)

        const { access_token } = await issueToken(user.id)

        res.status(200).json({
            success: true,
            message: "Proceed to reset password",
            access_token
        });
    })
});

const resetPassword = asyncWrapper(async (req, res, next) => {
    const { password } = req.body

    const authHeader = req.headers.authorization
    const token = authHeader.split(' ')[1]

    const payload = req.decoded
    const userId = payload.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    const haspassword = await Password.findOne({ where: { id: user.id } })

    if (!haspassword) return next(new BadRequestError('User has no prior password set'))
    haspassword.password = password
    await haspassword.save()

    // blacklist token to redis cache // TODO: add token to redis cache
    await BlacklistedTokens.create({ token })

    res.status(200).json({
        success: true,
        message: "Password reset successful",
    });
});

const signIn = asyncWrapper(async (req, res, next) => {
    const { password } = req.body;

    const { email, phone } = req.body
    const data = email
        ? { email } : phone
            ? { phone } : next(new BadRequestError('Please provide email or phone'));
    const user = await User.findOne({ where: data });
    if (!user) return next(new BadRequestError('Invalid user'));

    if (!user.isActivated) {
        let code = await generateCode()
        await Token.create({ userId: user.id, verificationCode: code })
        let options = {
            email: user.email,
            phone: user.phone,
        }

        const { access_token } = await issueToken(user.id)

        await sendverificationEmail(options, code)

        return res.status(422).json({ // 422 unprocessable entity 
            success: true,
            message: 'User not verified, verification code sent successfully',
            access_token
        });
    }

    const passwordInstance = await Password.findOne({ where: { id: user.id } });
    if (!passwordInstance) {
        return next(new BadRequestError('User has no prior password set'));
    }

    if (!passwordInstance.isValidPassword(password)) {
        return next(new BadRequestError('Invalid user Credentials'));
    }

    const DefaultAddress = await DeliveryAddress.findOne({ where: { userId: user.id, isDefault: true } })
    let hasdefaultAddress = false
    if (DefaultAddress) { hasdefaultAddress = true }

    const cart = (await Cart.findOne({ where: { userId: user.id } })).checkoutData
    let hascheckoutData = false
    if (cart) { hascheckoutData = true }

    // set user active
    user.status = "ACTIVE"
    await user.save()

    let tokens;
    // check if the user has a store 
    const stores = await user.getBrands()
    if (stores.length > 0) {
        user.vendorMode = true
        tokens = await issueToken(user.id, stores[0].id)
        await user.save()
    } else {
        tokens = await issueToken(user.id)
    }

    const { access_token, refresh_token } = tokens

    res.status(200).json({
        success: true,
        message: "Sign in successful",
        user,
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
            include: [{
                model: Cart,
                as: 'Cart',
                attributes: { exclude: ['checkoutData'] },
                include: [{
                    model: Cart,
                    as: 'Wishlists',
                    attributes: ['id'],
                }]
            },
            { model: Wallet }
            ]
        }
    );
    if (!user) return next(new BadRequestError('Unverified user'))
    let DefaultAddress;
    DefaultAddress = await DeliveryAddress.findOne({ where: { userId: user.id, isDefault: true } })

    if (!DefaultAddress || DefaultAddress.length < 1 || DefaultAddress === null) {
        DefaultAddress = {}
    }

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

    res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        user,
        stores: stores,
        DefaultAddress
    });
});

const getNewAccessToken = asyncWrapper(async (req, res, next) => {
    const autho = req.headers.authorization

    if (!autho) return next(new BadRequestError('Invalid authorization'))
    const refresh_token = autho.split(' ')[1]
    // check if token is blacklisted    // TO DO retrieve from redis cache
    const isBlacklisted = await BlacklistedTokens.findOne({ where: { token: refresh_token } })

    if (isBlacklisted) return next(new BadRequestError('Invalid authorization'))

    const payload = await decodeJWT(refresh_token, 'refresh')

    const userId = payload.id
    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))
    const { access_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: "New access token retrieved successfully",
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
        user.status = "ACTIVE"
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

const googleSignIn = asyncWrapper(async (req, res, next) => {
    const { googleId, email } = req.user;

    let user = await User.findOne({ where: { email } });

    if (user.googleId !== googleId) {
        return next(new BadRequestError('Invalid user'));
    }
    user.status = "ACTIVE"
    await user.save()

    // Generate a JWT token for authentication
    const { access_token, refresh_token } = await issueToken(user.id)

    res.status(200).json({
        success: true,
        message: 'User signed in successfully',
        access_token,
        refresh_token
    });
});

const logout = asyncWrapper(async (req, res, next) => {
    const autho = req.headers.authorization

    if (!autho) return next(new BadRequestError('Invalid authorization'))
    const token = autho.split(' ')[1]

    const payload = await decodeJWT(token)

    const userId = payload.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    user.status = "INACTIVE"
    await user.save()

    // blacklist token
    await BlacklistedTokens.create({ token })

    res.status(200).json({
        success: true,
        message: "User logged out successfully",
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

    res.status(200).json(responseData)

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
        const { access_token } = await issueToken(user.id, storeId)
        responseData.access_token = access_token
    }

    res.status(200).json(responseData)
});

const registerStore = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {

        const decoded = req.decoded
        const { storeName, phone, industry, country, address, state, city, postal } = req.body

        if (!storeName || !phone || !industry || !country || !address || !state || !city) {
            return next(new BadRequestError('Please provide all required fields'))
        }
        // CHECK FOR VALID PHONE NUMBER using twilio
        // phoneNumberLookup({phone})

        const user = await User.findByPk(decoded.id)
        if (!user) return next(new BadRequestError('Invalid user'))

        const storeExists = await Brand.findOne({ where: { businessPhone: phone } });

        if (storeExists) {
            return next(new BadRequestError('A Store with this phone number already exists'));
        }

        const details = {
            user: user.id,
            folder: `Stores/${storeName}/banner`,
        }
        let url;
        if (req.file) {
            url = await uploadSingleFile(req.file, details)
        }

        const addressdetails = address + ',' + city + ',' + state + ',' + country

        const detailss = {
            name: storeName,
            email: user.email,
            phone: phone,
            address: addressdetails,
        }
        const address_code = await validateAddress(detailss)
        if (!address_code) return next(new BadRequestError('Invalid address'))

        // add details to store 
        const store = await Brand.create({
            userId: decoded.id,
            name: storeName,
            businessPhone: phone,
            industry: industry,
            country: country,
            address,
            state,
            owner: decoded.id,
            city: city,
            postal,
            logo: url ? url : LOGO,
        })

        // add user to store 
        await store.addUser(user, { through: { role: 'owner' } })

        // create new address in address table
        await DeliveryAddress.create({
            storeId: store.id,
            address,
            city,
            state,
            country,
            phone: req.body.phone ? user.phone : user.phone,
            addressCode: address_code,
            isDefault: true
        })

        const wallet = {
            id: store.id,
            type: 'store'
        }
        const wallet_ = await generateWallet(wallet) // generate wallet for store

        res.status(200).json({
            success: true,
            message: "Store created successfully",
            store
        });
    });
});

module.exports = {
    signUp,
    verifyEmail,
    profileOnboarding,
    forgotPassword,
    resetPassword,
    getloggedInUser,
    getNewAccessToken,
    signIn,
    resendVerificationCode,
    googleSignIn,
    facebookauth,
    logout,
    switchAccount,
    registerStore,
    selectStore
}


