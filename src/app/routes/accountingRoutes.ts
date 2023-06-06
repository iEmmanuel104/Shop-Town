import express from 'express';
import { Router } from 'express';
import { getUserStats } from '../controllers/accountingController';

const router: Router = express.Router();

router.get('/:id/stats', getUserStats);

export default router;
