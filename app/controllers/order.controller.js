const { Product, User, Order, Brand, Category, Cart, ShipbubbleOrder, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { KSECURE_FEE } = require('../utils/configs');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const { v4: uuidv4 } = require('uuid');


const createOrder = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const userInfo = await User.findOne({ where: { id: userId } });
        const { shipping_method, storeId } = req.body;
        const cart = await Cart.findOne({ where: { userId } });
        console.log(cart.checkoutData)
        let shippingMethod = { type: shipping_method }
        let cartdetails = {
            items: cart.items,
            info: cart.checkoutData.checkkout_data,
            courier: cart.checkoutData.cheapest_courier,
        }

        const store = await Brand.findOne(
            {
                where: { id: storeId },
                attributes: ['socials']
            })
        if (!store) {
            throw new NotFoundError('Store not found');
        }
        let order, socials, kship_order, shippingObject, returnobject;

        socials = store.socials;
        order = await Order.create({
            userId,
            shippingMethod,
            cartdetails,
            storeId,
        }, { transaction: t });

        shippingObject = {
            orderId: order.id,
            requestToken: cart.checkoutData.request_token,
            serviceCode: cart.checkoutData.cheapest_courier.service_code,
            courierId: cart.checkoutData.cheapest_courier.courier_id,
            packageCost: cart.totalAmount,
            deliveryFee: cart.checkoutData.cheapest_courier.total,
        }

        returnobject = {
            order,
            socials
        }

        if (shipping_method === 'seller') {
            // send order request notification to seller
        } else if (shipping_method === 'kship') {
            kship_order = await ShipbubbleOrder.create(shippingObject, { transaction: t });
            returnobject.kship_order = kship_order;
        } else if (shipping_method === 'ksecure') {
            kship_order = await ShipbubbleOrder.create({
                ...shippingObject,
                isKSecure: true,
                kSecureFee: parseFloat(KSECURE_FEE),
            }, { transaction: t });
            returnobject.ksecure_order = kship_order;
        } else {
            throw new BadRequestError('Invalid shipping method');
        }

        // ======= HERE UNCOMMENT BELOW =======

        // const orderInfo = await Order.scope('includeStore').findOne({ where: { id: order.id } });

        res.status(200).json({
            success: true,
            message: 'Order created successfully, please proceed to make payment',
            data: returnobject
        });
    })
});

const getAllOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const orders = await Order.findAll({ where: { userId } });
    res.status(200).json({
        success: true,
        data: orders
    });
}
);

const getOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await Order.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    res.status(200).json({
        success: true,
        data: order
    });
}
);

const deleteOrder = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const order = await Order.findOne({ where: { id: req.params.id, userId } });
        if (!order) {
            throw new NotFoundError('Order not found');
        }
        await order.destroy({ transaction: t });
        res.status(200).json({
            success: true,
            data: {}
        });
    })
})

const getKsecureShipOrder = asyncWrapper(async (req, res) => {

    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KsecureShip.scope('includeStore').findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    res.status(200).json({
        success: true,
        data: order
    });
});


module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    deleteOrder,
}

