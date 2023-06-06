const secret = "H$$HGS@MRP(KBP&"
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';;
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
import token from '../utils/token'
import UUID from 'uuid'
import sendEmail from '../utils/email'
const { BadRequestError, UnauthorizedError } = CustomError
const { sensitive_permissions } = require('../middlewares/permissions')
const { getAuthCodes, getAuthTokens, decodeJWT } = token
const { ArtistUser, Artist, Tenant, User, TenantUser, Asset, Product, ArtistProduct, ArtistAsset, Restriction } = db
const { sequelize, Sequelize } = db

// Add custom restrictions for a particular user
const addManualRestriction = async (req: Request, res: Response) => {
    const { user_id, restrictions } = req.body

    const user = await User.findOne({ where: { id: user_id } })
    if (!user) {
        throw new BadRequestError('User not found')
    }

    // Check for existing permission record for user
    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })
    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    const user_restriction = permission_obj.restrictions,
        user_permission = permission_obj.permissions

    const result = []

    // Add restrictions to users row
    for (let i = 0; i < restrictions.length; i++) {
        // Add restriction if no duplicate exists
        if (!user_restriction.includes(restrictions[i])) {
            user_restriction.push(restrictions[i])
        } else {
            // Duplicate restriction found
            result.push(restrictions[i])
            continue
        }

        // Remove restriction from permissions if it exists
        if (user_permission.includes(restrictions[i])) {
            user_permission.splice(user_permission.indexOf(restrictions[i]), 1)
        }
    }

    // Throw error if duplicate restrictions found
    if (result.length > 0) {
        throw new BadRequestError('Duplicate restrictions found')
    }

    // Update permission table
    await Restriction.update(
        { permissions: user_permission, restrictions: user_restriction },
        { where: { userId: user_id } }
    )

    res.status(200).json({ message: 'Restriction added successfully' })
}

// Remove custom restrictions for particular user
const removeManualRestriction = async (req: Request, res: Response) => {
    const { user_id, restrictions } = req.body

    const user = await User.findOne({ where: { id: user_id } })
    if (!user) {
        throw new BadRequestError('User not found')
    }

    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })

    console.log(permission_obj.get({ plain: true }))

    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    const user_restriction = permission_obj.restrictions,
        user_permission = permission_obj.permissions

    for (let i = 0; i < restrictions.length; i++) {
        if (user_restriction.includes(restrictions[i])) {
            user_restriction.pop(i)
        }
    }

    console.log(user_restriction)
    await Restriction.update(
        { permissions: user_permission, restrictions: user_restriction },
        { where: { userId: user_id } }
    )

    res.status(200).json({ message: 'Restriction removed successfully' })
}

// Get restrictions for a particular user
const getManualRestrictionsForUser = async (req: Request, res: Response) => {
    const { user_id } = req.body
    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })

    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    const user_restriction = permission_obj.restrictions

    res.status(200).json({
        message: 'Restriction data found',
        user_restriction,
    })
}

// Update user's role
const updateUsersRole = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { user_id, role, isActive } = req.body

    const restricted_roles = [
        'admin',
        'superadmin',
        'label_admin',
        'main_admin',
        'main_superadmin',
    ]

    if (restricted_roles.includes(role)) {
        throw new UnauthorizedError('Invalid role')
    }

    const user = await User.findByPk(user_id)
    if (!user) {
        throw new BadRequestError('Invalid user id')
    }

    await User.update({ role, isActive }, { where: { id: user_id } })

    return res.status(200).send({ message: 'Successful' })
})

// Add custom permissions to paticular user's record
const addManualPermission = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { user_id, permissions } = req.body

    const user = await User.findByPk(user_id)
    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })

    if (!user) {
        throw new BadRequestError('Invalid user id')
    }
    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    const user_permissions = permission_obj.permissions,
        user_restrictions = permission_obj.restrictions

    // Add new permissions to users permission record
    const result = []
    for (let i = 0; i < permissions.length; i++) {
        // Add permission only if no duplicate exists
        if (!user_permissions.includes(permissions[i])) {
            user_permissions.push(permissions[i])
        } else {
            // Duplicate permission found
            result.push(permissions[i])
            continue
        }

        // Check if new permission exists in users restriction record
        // If it exists remove it
        if (user_restrictions.includes(permissions[i])) {
            user_restrictions.splice(
                user_restrictions.indexOf(permissions[i]),
                1
            )
        }
    }

    // Throw error if duplicate restrictions found
    if (result.length > 0) {
        throw new BadRequestError('Duplicate permissions found')
    }

    // Update users permisssion and restrictions record
    await Restriction.update(
        {
            permissions: user_permissions,
            restrictions: user_restrictions,
        },
        { where: { userId: user_id } }
    )

    return res.status(200).send({ message: 'Successful' })
})

// Remove custom permissison for particular users record
const removeManualPermission = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { user_id, permissions } = req.body

    const user = await User.findByPk(user_id)
    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })

    if (!user) {
        throw new BadRequestError('Invalid user id')
    }
    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    for (let i = 0; i < permissions.length; i++) {
        permission_obj.permissions.pop(i)

        // Add to restriction if not already there
        if (!permission_obj.restrictions.includes(permissions[i])) {
            permission_obj.restrictions.push(permissions[i])
        }
    }

    // Update users permisssion and restriction record
    await Restriction.update(
        {
            permissions: permission_obj.permissions,
            restrictions: permission_obj.restrictions,
        },
        { where: {} }
    )

    return res.status(200).send({ message: 'Successful' })
})

// Get all custom permission for particular user
const getManualPermissionsForUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { user_id } = req.body

    const user = await User.findByPk(user_id)
    const permission_obj = await Restriction.findOne({
        where: { userId: user_id },
    })

    if (!user) {
        throw new BadRequestError('Invalid user id')
    }
    if (!permission_obj) {
        throw new BadRequestError('Invalid permission id')
    }

    return res.status(200).send({
        message: 'Successful',
        permissions: permission_obj.permissions,
    })
})

export default {
    addManualRestriction,
    removeManualRestriction,
    getManualRestrictionsForUser,
    updateUsersRole,
    addManualPermission,
    removeManualPermission,
    getManualPermissionsForUser,
}
