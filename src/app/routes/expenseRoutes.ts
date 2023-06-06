import express from 'express';
import { Router } from 'express';
import Expense from '../controllers/expenseController';
import multer from '../middlewares/uploadmiddleware';
const {
    createExpense,
    createBulkExpense,
    deleteExpense,
    getExpense,
    getExpenses,
    updateExpense,
} = Expense;

const router: Router = express.Router();

router.route('/').post(multer.array('files'), createExpense).get(getExpenses);

router
    .route('/:id')
    .get(getExpense)
    .put(updateExpense)
    .delete(deleteExpense);

router.route('/bulk').post(createBulkExpense);

export default router;
