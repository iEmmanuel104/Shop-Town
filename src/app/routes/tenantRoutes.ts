import express from 'express';
import { Request, Response } from 'express';
import  authmiddlewares  from '../middlewares/authMiddleware';
const { basicAuth } = authmiddlewares;
// const requestTenant = (req: Request, res: Response, next: Function) => next();
import tenantController from '../controllers/tenantController';

const { createTenant, updateTenant, getTenantInfo, getTenantStats, getTenants, deleteTenant } = tenantController;

const router = express.Router();

router.route('/')
    .post(createTenant)
    .put(basicAuth, updateTenant)
    .get(basicAuth, getTenantInfo)
    .delete(basicAuth, deleteTenant);

router.get('/stats', basicAuth, getTenantStats);
router.get('/all', getTenants);

export default router;
