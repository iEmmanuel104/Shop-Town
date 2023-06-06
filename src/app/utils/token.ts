import db from '../../models/index';
import jwt from 'jsonwebtoken';
import customErrors from './customErrors';
import endpoints from './endpoints';
import config from './config';
const { NotFoundError } = customErrors
const { User, Token, Tenant, Restriction } = db
const { sequelize, Sequelize } = db
import { v4 as UUID } from 'uuid';
type JWT_PAYLOAD = {
    id: string,
    email: string,
    role: string,
    tenants: string[],
    active_tenant?: string,
    priviledges: {
        permissions: string[],
        restrictions: string[]
    }
}
const getAuthTokens = async (user_id: string, active_tenant?: string) => {
    try {
        const current_user = await User.findByPk(user_id, {
            include: {
                model: Tenant,
                attributes: ['uid']
            },
            // raw: true
        })

        if (!current_user) {
            throw new NotFoundError('User does not exist')
        }

        let user_permissions = await Restriction.findOne({ where: { userId: user_id } })
        const Permission = endpoints.permissions
        if (!user_permissions) {
            console.log('creating new permissions')
            user_permissions = new Restriction({ userId: user_id })
            if (current_user.role === 'label_admin' || 
                current_user.role === 'admin') {
                user_permissions.permission = Permission.admin.endpoints
            } else if (current_user.role === 'super_admin' ||
                current_user.role === 'main_super_admin') {
                user_permissions.permission = Permission.superadmin.endpoints
            } else if (current_user.role === 'user') {
                user_permissions.permission = Permission.user.endpoints
            }
        }

        // console.log(user_permissions)
        user_permissions = user_permissions.save()

        const { permissions, restrictions } = user_permissions

        let tenants: string[] = []
        const Adminroles = ['super_admin', 'main_super_admin', 'main_super_admin']
        if (Adminroles.includes(current_user.role)) {
            tenants = await Tenant.findAll().then((items: any[]) => items.map((item: any) => item.uid));
        } else {
            tenants = current_user.Tenants.map((item: any) => item.uid)
        }

        const data: JWT_PAYLOAD = {
            id: current_user.id,
            email: current_user.email,
            role: current_user.role,
            tenants: tenants.length ? tenants : [],
            priviledges: {
                permissions: permissions ? permissions : [],
                restrictions: restrictions ? restrictions : []
            }
        }

        if (active_tenant) {
            data['active_tenant'] = active_tenant
        }

        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
            config.JWT_ACCESS_EXP = '6h'
            config.JWT_REFRESH_EXP = '1d'
        }

        const access_token = jwt.sign(data, config.JWT_ACCESS_SECRET!, {
            expiresIn: config.JWT_ACCESS_EXP,
        })
        const refresh_token = jwt.sign(data, config.JWT_REFRESH_SECRET!, {
            expiresIn: config.JWT_REFRESH_EXP,
        })

        return { access_token, refresh_token }
    } catch (error) {
        throw error
    }
}

const getAuthCodes = async (user_id: string, code_type: string) => {
    try {
        let random_code = `${Math.floor(100000 + Math.random() * 900000)}`
        let verification_code,
            password_reset_code,
            activation_code,
            activation_code1,
            activation_code2,
            activation_code3

        if (code_type == 'verification') {
            verification_code = random_code

            const [token, created] = await Token.findOrCreate({
                where: { userId: user_id },
                defaults: { verification_code },
            })

            if (!created) {
                await token.update({ verification_code })
            }
        }

        if (code_type == 'password_reset') {
            password_reset_code = random_code

            const [token, created] = await Token.findOrCreate({
                where: { userId: user_id },
                defaults: { password_reset_code },
            })

            if (!created) {
                await token.update({ password_reset_code })
            }
        }

        if (code_type == 'activation') {
            activation_code = UUID()

            const [token, created] = await Token.findOrCreate({
                where: { userId: user_id },
                defaults: { activation_code },
            })

            if (!created) {
                await token.update({ activation_code })
            }
        }

        // If code_type is 'su_activation', generate 3 codes - SuperAdminAccountActivation
        if (code_type == 'su_activation') {
            activation_code1 = UUID() // Will be sent to user
            activation_code2 = UUID() // Will be sent to first admin
            activation_code3 = UUID() // Will be sent to second admin

            const activation_code = `${activation_code1}-${activation_code2}`

            const [token, created] = await Token.findOrCreate({
                where: { userId: user_id },
                defaults: { activation_code },
            })

            if (!created) {
                await token.update({ activation_code })
            }

            console.log(activation_code1, "activation_code1")
            console.log(activation_code2, "activation_code2")

            const upda = await Token.findOne({ where: { userId: user_id } })
        }

        return {
            verification_code,
            password_reset_code,
            activation_code,
            activation_code1,
            activation_code2,
        }
    } catch (error) {
        throw error
    }
}

const decodeJWT = (token: string, type: string | null) => {
    try {
        let secret, expiry
        switch (type) {
            case 'refresh':
                secret = config.JWT_REFRESH_SECRET
                expiry = config.JWT_REFRESH_EXP
                break
            default:
                secret = config.JWT_ACCESS_SECRET
                expiry = config.JWT_ACCESS_EXP
        }

        const decoded: string | jwt.JwtPayload = jwt.verify(token, secret!)
        return decoded
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new customErrors.TokenExpiredError('Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new customErrors.JsonWebTokenError('Invalid token');
        }
        throw error
    }
}

export default { getAuthTokens, getAuthCodes, decodeJWT }
export { JWT_PAYLOAD }