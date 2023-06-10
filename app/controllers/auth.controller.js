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

const SignUp = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { email, firstName, lastName, phone, password } = req.body;
        if (!email | !firstName | !lastName) return next(new BadRequestError('Please fill all required fields'));

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

    const decoded = req.decoded
    if (decoded.isActivated === true) return next(new BadRequestError('User already verified, please login'))

    // console.log('decoded', decoded)
    const userId = decoded.id
    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    const token = await Token.findOne({ where: { verificationCode: code } })

    if (!token) return next(new BadRequestError('Invalid verification code'))

    if (token.userId !== userId) return next(new BadRequestError('Unauthorized'))

    // update user isActivated to true
    const updatedUser = await User.update({ isActivated: true }, { where: { id: userId } })

    console.log ('updatedUser', updatedUser)

    // user.isActivated === 'true'
    // await user.save()
    const walleti = {
        id: user.id,
        type: 'customer'
    }
    const wallet = await generateWallet(walleti)
    const cart = await createCart(user.id)

    console.log('User Wallet Generated', wallet)
    console.log('User Cart Generated', cart)

    await token.destroy()

    res.status(200).json({
        success: true,
        message: 'User Email verified successfully',
        // details: { wallet, cart }
    });
});

const resendVerificationCode = asyncWrapper(async (req, res, next) => {
    // const { userId } = req.body
    const decoded = req.decoded
    console.log('decoded', decoded)
    const userId = decoded.id

    if (decoded.isActivated) return next(new BadRequestError('User already verified'))

    const user = await User.findByPk(userId)

    if (!user) return next(new BadRequestError('Invalid user'))

    let code = await generateCode()
    console.log('verifycode', code)

    await Token.create({ userId: user.id, verificationCode: code })
    let options = {
        email: user.email,
        phone: user.phone,
    }
    await sendverificationEmail(options, code)
    console.log('verification email sent')

    res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
    });
});

const profileOnboarding = asyncWrapper(async (req, res, next) => {
    const { location } = req.body
    const decoded = req.decoded
    const userId = decoded.id
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

    const addressdetails = location + ',' + req.body.city + ',' + req.body.state + ',' + req.body.country,
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
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        phone: req.body.phone ? user.phone : user.phone,
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

        const data = req.body.email ? { email: req.body.email }
            : req.body.phone ? { phone: req.body.phone }
                : next(new BadRequestError('Please provide email or phone'));

        const user = await User.findOne({ where: data });

        if (!user) return next(new BadRequestError('No user found'))

        const haspassword = await Password.findOne({ where: { id: user.id } })

        if (!haspassword) {
            // create password
            await Password.create({ id: user.id, password: 'password' })
        }

        let code = await generateCode()
        console.log('verifycode', code)

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

    const decoded = req.decoded
    const userId = decoded.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))

    const haspassword = await Password.findOne({ where: { id: user.id } })

    if (!haspassword) return next(new BadRequestError('User has no prior password set'))
    haspassword.password = password
    await haspassword.save()

    // blacklist token
    await BlacklistedTokens.create({ token })

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

    const user = await User.findOne(
        {
            where: data,
            include: [
                { model: Cart },
                { model: Wallet }
            ]
        }
    );
    if (!user) return next(new BadRequestError('Invalid user'));

    if (!user.isActivated) return next(new BadRequestError('User not verified'));

    const passwordInstance = await Password.findOne({ where: { id: user.id } });
    if (!passwordInstance) {
        return next(new BadRequestError('User has no prior password set'));
    }

    if (!passwordInstance.isValidPassword(password)) {
        return next(new BadRequestError('Invalid user Credentials'));
    }

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
        access_token,
        refresh_token
    });

});

const getloggedInUser = asyncWrapper(async (req, res, next) => {

    const decoded = req.decoded

    const userId = decoded.id
    console.log('userId', userId)

    const user = await User.scope('verified').findOne(
        {
            where: { id: userId },
            include: [{
                model: Cart,
                as: 'Cart',
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
        stores: stores
    });
});

const getNewAccessToken = asyncWrapper(async (req, res, next) => {
    const autho = req.headers.authorization

    if (!autho) return next(new BadRequestError('Invalid authorization'))
    const refresh_token = autho.split(' ')[1]
    // check if token is blacklisted    
    const isBlacklisted = await BlacklistedTokens.findOne({ where: { token: refresh_token } })

    if (isBlacklisted) return next(new BadRequestError('Invalid authorization'))

    const decoded = await decodeJWT(refresh_token, 'refresh')

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

    const decoded = await decodeJWT(token)

    const userId = decoded.id

    const user = await User.findByPk(userId)
    if (!user) return next(new BadRequestError('Invalid user'))
    user.status = "INACTIVE"
    await user.save()
    // blacklist token
    await BlacklistedTokens.create({ token })

    console.log("token blacklised successfully")

    res.status(200).json({
        success: true,
        message: "User logged out successfully",
    });
});

const SwitchAccount = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded
    console.log(decoded)
    const userId = decoded.id
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

    // if there is only one store console log its id
    // let access_token;
    // if (stores.length === 1) {
    //     console.log('store', stores)
    //     console.log('store  id', stores[0].id)
    //     const tokens = await issueToken(user.id, stores[0].id)
    //     access_token = tokens.access_token
    // }

    await user.save()

    const message = `User switched to ${user.vendorMode ? 'seller' : 'customer'} mode successfully`
    let responseData = {
        success: true,
        message,
    }
    // if (access_token) {
    //     responseData.access_token = access_token
    // }
    if (user.vendorMode) {
        responseData.stores = stores
    }

    res.status(200).json(responseData)

});

const selectStore = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded
    const { storeId } = req.body
    const user = await User.findByPk(decoded.id)
    if (!user) return next(new BadRequestError('Invalid user'))
    // check if user is associated with the store
    const store = await Brand.findByPk(storeId)
    if (!store) return next(new BadRequestError('Invalid store'))
    const isAssociated = await store.hasUser(user)
    if (!isAssociated) return next(new BadRequestError('Unauthorized'))

    console.log('storeId', storeId)

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

const RegisterStore = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded
    const { storeName, phone, industry, country, address, state, city, postal } = req.body
    const user = await User.findByPk(decoded.id)
    if (!user) return next(new BadRequestError('Invalid user'))
    // if (decoded.vendorMode === false) return next(new BadRequestError('please switch to seller mode'))

    // CHECK IF USER HAS A STORE
    // const hasStore = await user.getBrands()
    // if (hasStore.length > 0) return next(new BadRequestError('User already has a store'))

    const details = {
        user: user.id,
        folder: `Stores/${storeName}/banner`,
    }
    let url;
    if (req.file) {
        url = await uploadSingleFile(req.file, details)
    }
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

    const addressdetails = address + ',' + city + ',' + state + ',' + country

    console.log(addressdetails)

    const detailss = {
        name: storeName,
        email: user.email,
        phone: phone,
        address: addressdetails,
    }
    console.log(detailss)
    const address_code = await validateAddress(detailss)
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
    const walleti = {
        id: store.id,
        type: 'store'
    }
    const wallet = await generateWallet(walleti)

    console.log('Store Wallet Generated', wallet)
    res.status(200).json({
        success: true,
        message: "Store created successfully",
        store
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
    googleSignIn,
    facebookauth,
    logout,
    SwitchAccount,
    RegisterStore,
    selectStore
}


