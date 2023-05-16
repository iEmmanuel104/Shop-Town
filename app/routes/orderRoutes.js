const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')

const {
    createOrder
 
} = require('../controllers/order.controller')

router.route('/')
    .post(basicAuth, createOrder)


module.exports = router
