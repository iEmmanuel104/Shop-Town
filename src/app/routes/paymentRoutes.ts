import express from 'express';
import Payment from '../controllers/paymentController';
import multer from '../middlewares/uploadmiddleware';

const { getPayment, getPayments, createPayment, updatePayment, deletePayment, createBulkPayment } = Payment;

const router = express.Router();

router.route('/')
    .post(multer.array('file'), createPayment)
    .get(getPayments);

router.route('/:id')
    .put(updatePayment)
    .get(getPayment)
    .delete(deletePayment);

router.route('/bulk').post(createBulkPayment);

// router.route('/:id/:variable')
// .patch(updatePaymentVariable)

export default router;
