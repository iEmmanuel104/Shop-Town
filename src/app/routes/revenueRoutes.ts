import express from 'express';
const router = express.Router();
import multer from '../middlewares/uploadmiddleware';

import Revenue from '../controllers/revenueController';

const {
    getRevenue,
    getRevenues,
    createRevenue,
    updateRevenue,
    deleteRevenue,
} = Revenue;

router.route('/')
    .post( multer.array('files'), createRevenue)
    .get(getRevenues);

router.route('/:id')
    .get(getRevenue)
    .put(updateRevenue)
    .delete(deleteRevenue);

export default router;
