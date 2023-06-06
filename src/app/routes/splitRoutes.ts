import express, { Router } from 'express';
import Split from '../controllers/splitController';
const { createSplit, updateSplit, getSplit, getSplits, deleteSplit } = Split;
const router: Router = express.Router();

router.route('/')
    .post(createSplit)
    .get(getSplits);

router.route('/:id')
    .put(updateSplit)
    .get(getSplit)
    .delete(deleteSplit);

export default router;
