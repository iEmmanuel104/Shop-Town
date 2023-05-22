const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')

const {
    createOrder,
    getAllOrders,
    getOrder,   
    deleteOrder,

 
} = require('../controllers/order.controller')

router.route('/')
    .post(basicAuth, createOrder)
    .get(basicAuth, getAllOrders)

router.route('/:id')
    .get(basicAuth, getOrder)
    .delete(basicAuth, deleteOrder)
    


module.exports = router
