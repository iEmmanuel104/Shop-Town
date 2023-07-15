const express = require('express');
const router = express.Router();
const { basicAuth } = require('../middlewares/authWares');

const { getCart, storeCart, updateCart, deleteCart, cartcheckout } = require('../controllers/cart.controller');

router.route('/wishlist').post(basicAuth, storeCart);
router.route('/:id').get(getCart);
router.route('/delete/:id').delete(deleteCart);
router.route('/update/:id').put(updateCart);
router.route('/checkout/rates').get(basicAuth, cartcheckout);

module.exports = router;
