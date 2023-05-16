const { Product, User, Order, Brand, Category, Cart, KShip, SellerShip, KsecureShip, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async')
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const { v4: uuidv4 } = require('uuid');


const createOrder = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const userInfo = await User.findOne({ 
        where: { id: userId },
        include: [
            {
                model: Cart,
            },
            {
                model: DeliveryAddress,
                where: {isDefault: true},
            }
        ]
     });
     console.log(userInfo); 
    // if (!userInfo) {
    //     throw new NotFoundError('User not found');
    // }
    // const cart = userInfo.Cart;
    // if (!cart) {
    //     throw new NotFoundError('Cart not found');
    // }
    // const deliveryAddress = userInfo.DeliveryAddress;
    // if (!deliveryAddress) {
    //     throw new NotFoundError('Delivery address not found');
    // }

    // query ship bubble api for shipping cost

    const order = await sequelize.transaction(async (t) => {
        const order = await Order.create({
            userId,
            status: 'active',
        }, { transaction: t });
        // await cart.destroy({ transaction: t });
        return order;
    }    );
    const orderInfo = await Order.scope('includeStore').findOne({ where: { id: order.id } });
    res.status(200).json({
        success: true,
        data: orderInfo
    });
});

const getOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const orders = await Order.scope('includeStore').findAll({ where: { userId } });
    res.status(200).json({
        success: true,
        data: orders
    });
}
);

const getOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await Order.scope('includeStore').findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    res.status(200).json({
        success: true,
        data: order
    });
}
);

const updateOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await Order.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    const updatedOrder = await order.update(req.body);
    res.status(200).json({
        success: true,
        data: updatedOrder
    });
}
);

const deleteOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await Order.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    await order.destroy();
    res.status(200).json({
        success: true,
        data: {}
    });
}
);

const getKShipOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const orders = await KShip.scope('includeStore').findAll({ where: { userId } });
    res.status(200).json({
        success: true,
        data: orders
    });
}
);

const getKShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KShip.scope('includeStore').findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    res.status(200).json({
        success: true,
        data: order
    });
}
);

const updateKShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    const updatedOrder = await order.update(req.body);
    res.status(200).json({
        success: true,
        data: updatedOrder
    });
}
);

const deleteKShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    await order.destroy();
    res.status(200).json({
        success: true,
        data: {}
    });
}
);

const getSellerShipOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const orders = await SellerShip.scope('includeStore').findAll({ where: { userId } });
    res.status(200).json({
        success: true,
        data: orders
    });
}
);

const getSellerShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await SellerShip.scope('includeStore').findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    res.status(200).json({
        success: true,
        data: order
    });
}
);

const updateSellerShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await SellerShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    const updatedOrder = await order.update(req.body);
    res.status(200).json({
        success: true,
        data: updatedOrder
    });
}
);

const deleteSellerShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await SellerShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    await order.destroy();
    res.status(200).json({
        success: true,
        data: {}
    });
}
);

const getKsecureShipOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const orders = await KsecureShip.scope('includeStore').findAll({ where: { userId } });
    res.status(200).json({
        success: true,
        data: orders
    });
}
);

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
}
);

const updateKsecureShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KsecureShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    const updatedOrder = await order.update(req.body);
    res.status(200).json({
        success: true,
        data: updatedOrder
    });
}
);

const deleteKsecureShipOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await KsecureShip.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    await order.destroy();
    res.status(200).json({
        success: true,
        data: {}
    });
}
);

module.exports = {
    createOrder,
}

