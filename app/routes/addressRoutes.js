const express = require('express');
const router = express.Router();
const { basicAuth } = require('../middlewares/authWares');

router.use(basicAuth);

const {
    AddNewAddress,
    GetDeliveryAddresses,
    GetDeliveryAddress,
    UpdateDeliveryAddress,
    DeleteDeliveryAddress,
    RevalidateDeliveryAddress,
} = require('../controllers/address.controller');

router.route('/').post(AddNewAddress).get(GetDeliveryAddresses);

router.route('/:id').get(GetDeliveryAddress).put(UpdateDeliveryAddress).delete(DeleteDeliveryAddress);

router.route('/revalidate/address').get(RevalidateDeliveryAddress);

module.exports = router;
