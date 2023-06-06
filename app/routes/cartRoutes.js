const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')

const {
    getCart,
    storeCart,
    updateCart,
    deleteCart,
    cartcheckout
} = require('../controllers/cart.controller')

router.route('/')
    .post(storeCart)

router.route('/:id')
    .get(getCart)
    .delete(deleteCart)
    .put(updateCart)
    .post(basicAuth, cartcheckout)


module.exports = router
