import asyncWrapper from "../middlewares/async";
import config from "../utils/config";
import CustomError from "../utils/customErrors";
const { UnauthorizedError, ForbiddenError } = CustomError;
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'
import db from '../../models/index';
import { JWT_PAYLOAD } from "../utils/token";
import endpoints, { Endpoint } from "../utils/endpoints";

const { Restriction } = db;

// Authorizations
const permissions = require('./permissions')
// const { Permission } = require('../models/permission')
const { BASE_ROUTE } = require('../utils/config')

interface RequestWithUser extends Request {
    user: any,
}

export default function (roles = ' ') {
    return asyncWrapper(async (req: RequestWithUser, res: Response, next: NextFunction) => {
        const allowed_roles = roles.split(' ')
        console.log('inside the permission handler')

        // Extract authorization token from header
        const headers = req.headers.authorization
        const token = headers?.split(' ')[1]
        if (!token) {
            throw new UnauthorizedError('Authentication required')
        }
        let payload: JWT_PAYLOAD

        const data: JWT_PAYLOAD = jwt.verify(token, config.JWT_ACCESS_SECRET!) as JWT_PAYLOAD
        payload = data
        req.user = { id: data.id, role: data.role, tenant: data.active_tenant }
        const user_role = req.user.role

        console.log(data)
        // Permitted role was passed into the permission handler
        if (
            allowed_roles.length != 1 &&
            allowed_roles[0] != '' &&
            !allowed_roles.includes(payload.role) &&
            user_role != 'guest'
        ) {
            // For Guest users, their permissions should be checked manually
            throw new UnauthorizedError('Unauthorized access')
        }

        let route = req.originalUrl.replace(BASE_ROUTE, '')
        const method = req.method

        const { permissions, restrictions } = payload.priviledges

        const { Endpoints } = endpoints
        console.log(route)
        // Check permissions and restrictions for this route
        if (route.includes(':id')) {
            const uuidRegex = /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/i;
            route = route.replace(uuidRegex, ':id');
        }
        console.log(route)

        const endpoint =
            Object.keys(Endpoints)
                .find(key => {
                    const endpoint = Endpoints[key]
                    if (endpoint.route === route) {
                        if (endpoint.method === method) {
                            return true
                        }
                    }
                })
        console.log(endpoint)
        if (!endpoint) {
            throw new ForbiddenError('Invalid request')
        }

        if (permissions && !permissions.includes(endpoint)) {
            throw new ForbiddenError('Invalid permissions')
        }

        if (restrictions && restrictions.includes(endpoint)) {
            throw new ForbiddenError('Invalid restrictions')
        }

        next()
    })
}
