// const { Tenant, User, TenantUser, BlacklistedTokens } = require("../../models");
import db from '../../models';
const { sequelize, Sequelize } = db
const Tenant = db.Tenant;
const User = db.User;
const BlacklistedTokens = db.BlacklistedTokens;
const TenantUser = db.TenantUser;

// import User from '../../models';
// import Tenant from '../../models';
// import TenantUser from '../../models';
// import BlacklistedTokens from '../../models';

const secret = 'H$$HGS@MRP(KBP&'
import customerrors from '../utils/customErrors'
const { NotFoundError, UnauthorizedError, BadRequestError } = customerrors
import token from '../utils/token';
const { decodeJWT, getAuthTokens } = token;
import { Request, Response, NextFunction } from 'express';
import asyncWrapper from './async';

const getTokenFromHeaders = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        throw new UnauthorizedError('Authentication required');
    }
    const jwtToken = authHeader.split(' ')[1],
        payload: any = decodeJWT(jwtToken, null);
    return payload.active_tenant;
}

declare global {
    namespace Express {
        interface Request {
            //tenant: Tenant['id']; // add a `tenant` property with the type of the `id` property of the `Tenant` model
            //user: User['id']; // add a `user` property with the type of the `id` property of the `User` model
            tenant: any;
            user: string;
        }
    }
}



const requestTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const autho = getTokenFromHeaders(req);
    console.log(autho)
    if (autho) {
        const token = autho.replace('Bearer ', '');
        const tenant = await Tenant.findOne({ where: { uid: token } });
        if (!tenant) res.status(401).send({ message: "Unauthorised" });
        console.log('tenant authorisation passed');
        req.tenant = tenant.id;
        console.log(req.tenant);

        next();
    } else {
        res.status(401).send({ message: "Unauthorised" });
    }
};

const basicAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('basic auth')
        const authHeader = req.headers.authorization;
    
        if (!authHeader || !authHeader.startsWith('Bearer')) {
            return res.status(401).send({ message: 'Authentication required' });
        }
    
        // To get new access token

        if (req.method === 'GET' && req.path === '/authtoken') {
            const payload: any = decodeJWT(authHeader.split(' ')[1], 'refresh');
    
            const new_access_token = (await getAuthTokens(
                payload.id,
                payload.active_tenant
            )).access_token;
    
            return res.status(200).send({ message: 'success', access_token: new_access_token });
        }

        // To select active tenant workspace
        
        if (req.method === 'POST' && req.path === '/select/tenant' && req.body.tenantId) {
            if (!authHeader) {
                return res.status(401).send({ message: 'Authorization header is missing' });
            }
    
            const token = authHeader.split(' ')[1];
            const payload: any = decodeJWT(token, null);
    
            const tenant = await Tenant.findOne({where: { uid: req.body.tenantId}});
            if (!tenant) {
                return res.status(404).send({ message: 'Tenant not found' });
            }
            // const tenantUser
    
            // check if any tenant exists in the payload list
            // if (!payload.tenants.some((tenantId: any) => tenantId === req.body.tenantId)) {
            //     return res.status(403).send({ message: 'Access denied' });
            // }

            console.log("payload.tenants", payload.tenants)
            console.log("req.body.tenantId", req.body.tenantId)
            if (!payload.tenants.includes(req.body.tenantId)) {
                return res.status(403).send({ message: 'Access denied' });
            }
    
            // generate new token
            const new_access_token = (await getAuthTokens(payload.id, req.body.tenantId)).access_token;
    
            return res.status(200).send({ message: `Succesfully signed into ${tenant.name} Workspace`,
             access_token: new_access_token });
        }
    
        // check if user is logged in
        const jwtToken = authHeader.split(' ')[1];
        const payload: any = decodeJWT(jwtToken, null);
    
        // Check if access token has been blaocklisted
        const blacklisted = await BlacklistedTokens.findOne({ where: { token: jwtToken } });
        if (blacklisted) {
            return res.status(401).send({ message: ' JWT token expired ' });
        }
    
        req.user = payload;
        // req.token = jwtToken;
    
        // const currUser = await User.findOne({ where: { id: payload.id } });
    
        // if (!currUser || !currUser.isActive && req.path !== '/activate/superadmin') {
        //     return res.status(401).send({ message: 'Unauthorized access' });
        // }
    
        // set the tenant ID on the request object
        const activeTenant: string = payload.active_tenant;
        if (activeTenant) {
            console.log("activeTenant", activeTenant)
            const tenant = await Tenant.findOne({ where: { uid: activeTenant } });
            if (tenant) {
                req.tenant = tenant.id;
            }
        } else if (payload.tenants.length === 1 && !activeTenant) {
            const tenant = await Tenant.findOne({ where: { uid: payload.tenants[0] } });

            if (tenant) {
                req.tenant = tenant.id;
            }
        } else if (payload.tenants.length > 1 && !activeTenant) {
            return res.status(403).send({ message: 'Please select a Workspace' });
        }

        console.log("req.tenant from basic auth = ", req.tenant)

        next();

    } catch (error) {
        console.log(error)
        next(error)
    }
};

export default { requestTenant, basicAuth}; 