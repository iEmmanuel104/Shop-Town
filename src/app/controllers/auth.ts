import { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
import config from '../utils/config'
import token from '../utils/token'
import { v4 as uuidv4 } from 'uuid';
import mailTemplates from '../utils/mailTemplates'
const {
    sendactivationEmailAdmin,
    accountactivationEmail,
    accountverificationEmail,
    passwordresetEmail,
} = mailTemplates
import { trackUserSIgnup } from '../utils/mixpanel';
import bcrypt from 'bcryptjs'
const { BadRequestError, UnauthorizedError } = CustomError
const { sensitive_permissions } = require('../middlewares/permissions')
const { getAuthCodes, getAuthTokens, decodeJWT } = token
const { Token, BlacklistedTokens, User, Tenant, TenantUser, Restriction, Password, LabelAdmin } = db
const { sequelize, Sequelize } = db
import endpoints from '../utils/endpoints';
import { encode } from 'punycode';
import { createDataset } from '../helpers/big_query_run';
import { modifyString } from '../utils/helpers';
import { uploadsingleFile } from '../utils/cloudConfig';
import configs from '../utils/config';
const { WEBSITE_URL } = configs


const signup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, phone, country, ipi, role, workspace } =
        // const { firstName, lastName, email, password, phone, country, ipi, role } =
        req.body

    let curr_user_email, curr_user_id, curr_user, user_token, activation_code

    // Check if user exists
    const existing_user = await User.findOne({ where: { email } })

    // User already exists, and email verified
    if (existing_user && existing_user.isVerified) {
        throw new BadRequestError('User already exists')
    }

    // No existing user or existing user's email unverified, create new user or update existing user
    if (!existing_user || !existing_user.isVerified) {
        let newrole: string | undefined;
        if (role === 'super_admin') {
            // Check if this is the first admin
            const num_admins = await User.count({ where: { role: 'super_admin' } })
            const is_first_admin = num_admins === 0

            newrole = is_first_admin ? 'main_super_admin' : 'super_admin'
        }
        let user;
        user = existing_user ? existing_user : await User.create({
            firstName,
            lastName,
            email,
            phone,
            country,
            ipi,
            role: newrole ? newrole : role,
            isActive: true,
        })
        // const haspassword = await Password.findOne({ where: { userId: user.id } })
        // if (!haspassword) await Password.create({userId: user.id, password})

        curr_user = user.get({ plain: true })
        curr_user_id = curr_user.id
        curr_user_email = curr_user.email

        if (role === 'label_admin') {
            await LabelAdmin.create({ userId: user.id })
            await user.update({ isActive: false })
            // create Tenant account
            let tenant: { [key: string]: string } = {}
            tenant['name'] = workspace
            tenant['email'] = req.body.email ? req.body.email : null
            const createdTenant = await Tenant.create(tenant);
            if (!createdTenant) return next(new CustomError.BadRequestError('Tenant not created'))
            console.log('tenant created successfully')
            // add user to tenant
            await createdTenant.addUser(user, { through: { model: 'TenantUser' } });
            console.log('user added to tenant successfully')
        }

        activation_code = (await getAuthCodes(user.id, 'activation')).activation_code


        const Permission = endpoints.permissions
        let user_permissions = new Restriction({ userId: curr_user.id })
        if (curr_user.role === 'label_admin' ||
            curr_user.role === 'admin') {
            user_permissions.permissions = Permission.admin.endpoints
        } else if (curr_user.role === 'super_admin' ||
            curr_user.role === 'main_super_admin') {
            user_permissions.permissions = Permission.superadmin.endpoints
        } else if (curr_user.role === 'guest') {
            user_permissions.permissions = Permission.user.endpoints
        }

        user_permissions = await user_permissions.save()
        // console.log('user_permissions', user_permissions.get({ plain: true }))
    }

    // Existing user's email unverified
    if (existing_user && !existing_user.isVerified) {
        curr_user_email = existing_user.email
        curr_user_id = existing_user.id
        curr_user = existing_user

        if (existing_user.role === 'label_admin' || existing_user.role === 'admin') {
            activation_code = (await getAuthCodes(existing_user.id, 'activation')).activation_code
        }
    }

    user_token = await Token.findOne({ where: { userId: curr_user_id } })
    if (!user_token) {
        user_token = await Token.create({
            userId: curr_user_id,
            activation_code
        })
    } else {
        user_token.activation_code = activation_code
        user_token = await user_token.save({ returning: true })
    }

    console.log(activation_code)

    // const { access_token } = await getAuthTokens(curr_user_id)

    const link = `${WEBSITE_URL}/email/activate?aktc=${activation_code}&e=${encodeURIComponent(curr_user_email)}`
    console.log(link)

    if (activation_code) {
        await accountactivationEmail(curr_user_email, activation_code, link)
    }

    // track user signup
    // await trackUserSIgnup({
    //     userId: curr_user_id,
    //     workspace: workspace ? workspace : '',
    //     email: curr_user_email,
    //     name: `${firstName} ${lastName}`,
    //     role: role ? role : '',
    //     phone: phone ? phone : '',
    // })

    return res.status(201).send({
        message: 'Successful, Email verification Instructions have been sent to your email',
        data: { email, workspace }
        // access_token,
    })
})

const verifyEmail = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { activation_code } = req.body
    const { email } = req.query

    if (!email) return next(new BadRequestError('Invalid credentials'))

    const user = await (User.findOne({ where: { email } }))
    if (!user) {
        throw new BadRequestError('Invalid verification code')
    }

    const user_token = await Token.findOne({ where: { userId: user.id } })

    if (!user_token) {
        throw new BadRequestError('Invalid verification code')
    }

    const { access_token } = await getAuthTokens(user.id)

    if (activation_code) {
        if (user_token.activation_code != activation_code) {
            throw new BadRequestError('Invalid activation link')
        }

        await User.update(
            {
                isVerified: true,
                isActive: true,
            },
            { where: { id: user.id } },
            { returning: true, plain: true }
        )

        console.log(await User.findByPk(user.id))

        // // create bigquery dataset for tenant
        // const tenant = await Tenant.findOne({ where: { email } })
        // let datasetId;
        // if (tenant) {
        //     const datasetname = await modifyString(tenant.name)
        //     datasetId = await createDataset(datasetname, tenant.id)
        //     console.log(datasetId)
        // }

        // await tenant.update({ bigqueryDataset: datasetId })      

        return res.status(200).send({ message: 'Email Verified Successfully, proceed to set your password', access_token })
    }

    throw new BadRequestError('No activation link provided')
})

const setPassword = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body

    const payload: any = decodeJWT(req.headers.authorization!.split(' ')[1], '')
    const user_id = payload.id

    const user = await User.findByPk(user_id)
    if (!user) throw new BadRequestError('User not found')
    if (!user.isVerified) throw new BadRequestError('Email not verified, please verify your email')

    const haspassword = await Password.findOne({ where: { userId: user.id } })

    let tenants, active_tenant
    tenants = await user.getTenants()
    // if there is just 1 tenant set it as active
    if (tenants.length === 1) {
        active_tenant = tenants[0]
        console.log("active tenant to be sent ", active_tenant.uid)
    }

    const { access_token, refresh_token } = await getAuthTokens(user.id, active_tenant?.uid)

    if (!haspassword) {

        const pass = await Password.create({
            userId: user.id,
            password: password
        })

        const passs = await User.update({ hasPassword: true }, { where: { id: user.id } })
        console.log(await User.findByPk(user.id))

    } else {

        return next(new BadRequestError('Password already set, proceed to login'))
    }

    return res.status(200).send({ message: 'Password set successfully', access_token, refresh_token })
})

const login = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body
    const user = await User.findOne({ where: { email } })
    console.log(user?.get({ plain: true }))
    // console.log(user)
    if (!user) {
        throw new BadRequestError('Invalid email or password')
    }
    if (!user.isActive || !user.isVerified) {
        throw new UnauthorizedError('Unauthorized access, please verify your email')
    }

    const user_password = await Password.findOne({ where: { userId: user.id } })
    if (!user_password) {
        throw new BadRequestError('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user_password.password
    )
    if (!isPasswordValid) {
        throw new BadRequestError('Invalid email or password')
    }

    const Wroles = ["label_admin", "admin", "artist", "guest"]
    let tenants: string[] = []
    if (Wroles.includes(user.role)) {
        tenants = await Tenant.findAll({
            include: [{ model: User, where: { id: user.id } }],
        });
    } else {
        tenants = await Tenant.findAll()
    }
    const tenant_ids = tenants.map((tenant: any) => tenant.uid)

    // let active_tenant: string | undefined
    // if (tenant_ids.length === 1) {
    //     active_tenant = tenant_ids[0]419815
    // }

    const { access_token, refresh_token } = await getAuthTokens(user.id)

    return res.status(200).send({
        message: 'Successful',
        workspaces: tenant_ids ? tenant_ids : [],
        access_token,
        refresh_token,
        user
    })
})

const forgotPassword = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body
    console.log(email)
    const current_user = await User.findOne({ where: { email } })

    if (!current_user) {
        throw new BadRequestError('Invalid email')
    }

    const { password_reset_code } = await getAuthCodes(
        current_user.id,
        'password_reset'
    )
    const user_token = await Token.findOne({
        where: { userId: current_user.id },
    })

    if (!user_token) {
        await Token.create({ userId: current_user.id, password_reset_code })
    } else {
        await Token.update(
            { password_reset_code },
            { where: { userId: current_user.id } }
        )
    }
    console.log(password_reset_code)
    const link = `${WEBSITE_URL}/forgot/password/reset?prst=${password_reset_code}&e=${encodeURIComponent(current_user.email)}`
    console.log(link)
    await passwordresetEmail(current_user.email, link)

    // const { access_token } = await getAuthTokens(current_user.id)

    return res.status(200).send({
        message: 'Successful, Password reset code sent to users email',
        // access_token,
    })
})

const importdata = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    console.log(tenant)
    const foundTenant = await Tenant.findOne({ where: { id: tenant } })
    const datasetname = await modifyString(foundTenant.name)
    console.log(foundTenant)
    if (req.file) {
        const publicUrl = await uploadsingleFile(req, `TenantData/${datasetname}`)
        console.log('file uploaded', publicUrl)
    }
    // create new bigquery dataset for the worskpace
    const datasetId = await createDataset(datasetname, foundTenant.id)
    console.log(datasetId)
    await foundTenant.update({ bigqueryDataset: datasetId })

    return res.status(200).send({
        message: 'Platform data Uploaded Successfully and Dataset being processed',
    })
})

// Requires accesstoken, will be checked by auth middleware
const passwordReset = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password_reset_code, new_password } = req.body

    if (!password_reset_code || !new_password) {
        throw new BadRequestError('Invalid password reset code or new password')
    }

    const user = await User.findOne({ where: { email } })
    if (!user) {
        throw new BadRequestError(' Invalid password reset request')
    }

    const user_token = await Token.findOne({ where: { userId: user.id } })
    if (!user_token) {
        throw new BadRequestError('Invalid password reset code')
    }
    if (user_token.password_reset_code != password_reset_code) {
        throw new BadRequestError('Invalid password reset code')
    }

    const user_password = await Password.findOne({
        where: { userId: user.id },
    })
    // await user_password.updatePassword(new_password)

    // update password  
    // const salt = await bcrypt.genSalt(10)
    // const hashedPassword = await bcrypt.hash(new_password, salt)
    await Password.update({ password: new_password }, { where: { userId: user.id } })

    return res.status(200).send({ message: 'Successful' })
})

const logout = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new BadRequestError('Invalid access token')
    }

    const jwtToken = authHeader.split(' ')[1]
    await BlacklistedTokens.create({ token: jwtToken })

    return res.status(200).send({ message: 'Successful' })
})

const getLoggedInUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new BadRequestError('Invalid access token')
    }

    const jwtToken = authHeader.split(' ')[1]
    const payload: any = decodeJWT(jwtToken, '')

    let user = await User.findOne({ where: { id: payload.id } })
    if (!user) {
        throw new BadRequestError('Invalid access token')
    }

    let workspace = null
    let tenantuser = null
    if (payload.active_tenant) {
        const tenant = await Tenant.findOne({
            where: { uid: payload.active_tenant },
            attributes: ['name', 'uid', 'id'],
            raw: true
        })

        if (!tenant) {
            throw new BadRequestError('Invalid access token')
        }
        tenantuser = await TenantUser.findOne({
            where: { UserId: payload.id, TenantId: tenant.id },
            attributes: ['userType', 'nickName'],
        })
        // rremove the id from tenant 
        delete tenant.id
        workspace = tenant
    }

    return res.status(200).send({ message: 'Successful', user, workspace, tenantuser })
})

// const registerLabelAccount = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
//     /*
//         Admins can register and create a label account on the platform.
//         After verifying their email and logging in, then can invite other
//         users to be their tenant.
//     */

//     const userid = JSON.parse(JSON.stringify(req.user))
//     const { id } = userid

//     const admin = (await User.findByPk(id)).get({ plain: true })
//     // console.log(admin)
//     if (admin.role != 'super_admin' && admin.role != 'main_admin') {
//         throw new UnauthorizedError('Unauthorized access')
//     }

//     req.body.role = 'label_admin'
//     req.body.password = uuidv4()

//     console.log(req.body.password)

//     await signup(req, res, next)
// })

const inviteUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    /*
        Admins can invite other users via email to access certain parts of 
        the platform. During the invite process, admins can specify the 
        users priviledges.
    */
    const { firstName, lastName, email, permissions, restrictions, role } = req.body
    const password = uuidv4(),
        activation_code = uuidv4()
    // const role = 'guest'
    const userid = JSON.parse(JSON.stringify(req.user))
    const { id } = userid

    const curr_user = await User.findByPk(id)
    let created_user;

    const tenant = await Tenant.findByPk(req.tenant)
    const user_exists = (await User.findOne({ where: { email } }))?.get({ plain: true })
    // const user_exists = user_exist?.get({ plain: true })

    if (user_exists && !user_exists.hasPassword) {
        console.log('user exists but has no password')
        created_user = user_exists
    } else if (!user_exists || user_exists === null) {
        if (curr_user.role === 'main_super_admin') {
            // Create superadmin
            created_user = await User.create({
                firstName, lastName, email, role: 'super_admin'
            })
        }

        if (curr_user.role === 'super_admin') {
            // Create admin
            if (role === 'admin') {
                created_user = await User.create({
                    firstName, lastName, email, role: 'admin'
                })
                // link label
                tenant.addUser(created_user, { through: { model: 'TenantUser' } })
            }

            // Create guest user
            if (role === 'guest') {
                created_user = await User.create({
                    firstName, lastName, email, role: 'guest'
                })
                // link label
                tenant.addUser(created_user, { through: { model: 'TenantUser' } })
            }
        }

        if (curr_user.role === 'admin') {
            // Create user
            created_user = await User.create({
                firstName, lastName, email, role: 'guest'
            })

            // link label
            tenant.addUser(created_user, { through: { model: 'TenantUser' } })
        }
    }

    // Add default permissions
    const Permission = endpoints.permissions
    let user_permissions = new Restriction({ userId: created_user.id })
    if (created_user.role === 'admin') {
        user_permissions.permissions = Permission.admin.endpoints
    } else if (created_user.role === 'super_admin') {
        user_permissions.permissions = Permission.superadmin.endpoints
    } else if (created_user.role === 'user') {
        user_permissions.permissions = Permission.user.endpoints
    }

    const { verification_code } = await getAuthCodes(created_user.id, 'verification')

    let user_token
    user_token = await Token.findOne({ where: { userId: created_user.id } })
    if (!user_token) {
        user_token = await Token.create({
            userId: created_user.id,
            activation_code,
            verification_code,
        })
    } else {
        user_token.verification_code = verification_code
        user_token.activation_code = activation_code
        user_token = await user_token.save({ returning: true })
    }

    // console.log(activation_code, verification_code)

    const link = activation_code ? `${WEBSITE_URL}/email/activate?aktc=${activation_code}&e=${encodeURIComponent(created_user.email)}&isinvite=true` :
        `${WEBSITE_URL}/email/activate?vrfc=${verification_code}&e=${encodeURIComponent(created_user.email)}&isinvite=true`;
        console.log(link)

    if (created_user.role === 'super_admin') {
        accountactivationEmail(created_user.email, activation_code, link)
    } else {
        accountverificationEmail(created_user.email, verification_code as string, link)
    }

    return res.status(201).send({
        message: 'Successful, Email verification Instructions have been sent to your email',
        // access_token,
    })
})

const activateAccountInvite = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    /*
        Users who were invited (by admin) via email would have to activate
        their accounts and set password for login
    */

    const { activation_code, new_password, email } = req.body
    const user = await User.findOne({ where: { email } })
    if (!user) {
        throw new BadRequestError('User does not exist')
    }

    const user_activation = await Token.findOne({
        where: { activation_code },
    })
    if (!user_activation) {
        throw new BadRequestError('Invalid activation credentials')
    }

    const user_password = await Password.findOne({ where: { userId: user.id } })
    await user_password.updatePassword(new_password)

    await user.update({ isVerified: true, isActive: true })

    await Token.update(
        { activation_code: null, verification_code: null },
        { where: { userId: user.id } }
    )

    return res.status(200).send({
        message: 'User account activated successfully',
    })
})

const resendInvite = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => { })

export default {
    signup,
    login,
    verifyEmail,
    setPassword,
    importdata,
    forgotPassword,
    passwordReset,
    logout,
    getLoggedInUser,
    inviteUser,
    // registerLabelAccount,
    activateAccountInvite,
    resendInvite,

    // Admin
    // superAdminSignup,
    // activateSuperAdmin,
}

