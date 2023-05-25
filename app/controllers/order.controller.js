const { Product, User, Order, Brand, Category, Cart, ShipbubbleOrder, DeliveryAddress, Payment } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { FlutterwavePay, validateFlutterwavePay } = require('../services/flutterwave.service');
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
        const { shipping_method, storeId, option } = req.body;
        const cart = await Cart.findOne({ where: { userId } });
        let shippingMethod = { type: shipping_method }
        let cartdetails = {
            items: cart.items,
            totalAmount: cart.totalAmount,
            info: cart.checkoutData.checkkout_data,
            courier: cart.checkoutData.cheapest_courier,
        }

        const store = await Brand.findOne(
            {
                where: { id: storeId },
                attributes: ['socials', 'name', 'logo']
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

        const orderobj = {
            orderId: order.id,
            orderstatus: order.status,  
            orderdate: order.createdAt,
            orderamount: order.cartdetails.totalAmount,
            userId: order.userId,
            storeId: order.storeId,
            shippingMethod: order.shippingMethod
        }

        shippingObject = {
            orderId: order.id,
            requestToken: cart.checkoutData.request_token,
            serviceCode: cart.checkoutData.cheapest_courier.service_code,
            courierId: cart.checkoutData.cheapest_courier.courier_id,
            packageCost: cart.totalAmount,
            deliveryFee: cart.checkoutData.cheapest_courier.total,
        }

        returnobject = {
            order: orderobj,
            socials,
        } 

        let paymentamt = parseFloat(cart.totalAmount);

        if (shipping_method === 'seller') {
            // send order request notification to seller
        } else if (shipping_method === 'kship') {
            kship_order = await ShipbubbleOrder.create(shippingObject, { transaction: t });
            returnobject.deliveryFee = kship_order.deliveryFee;
            // returnobject.kship_order = kship_order;
            paymentamt = paymentamt + parseFloat(cart.checkoutData.cheapest_courier.total);
        } else if (shipping_method === 'ksecure') {
            kship_order = await ShipbubbleOrder.create({
                ...shippingObject, 
                isKSecure: true,
                kSecureFee: parseFloat(KSECURE_FEE),
            }, { transaction: t });
            returnobject.deliveryFee = kship_order.deliveryFee;
            returnobject.kSecureFee = parseFloat(KSECURE_FEE);
            // returnobject.ksecure_order = kship_order;
            paymentamt = paymentamt + parseFloat(cart.checkoutData.cheapest_courier.total) + parseFloat(KSECURE_FEE);
        } else {
            throw new BadRequestError('Invalid shipping method');
        }
        // ======= HERE UNCOMMENT BELOW =======
        if (kship_order && kship_order.requestToken) {
            const paydetails = {
                amount: parseFloat(paymentamt),
                email: userInfo.email,
                phone: userInfo.phone,
                fullName: userInfo.fullName,
                tx_ref: `Klickorder_${order.id}`,
                storeName: store.name,
                storeLogo: store.logo,
                kshipId: kship_order ? kship_order.id : null,
                isKSecure: kship_order ? kship_order.isKSecure : false,
                kSecureFee: kship_order ? kship_order.kSecureFee : null,
                shippingfee: kship_order ? kship_order.deliveryFee : null,
            }


            if (option === 'CARD') {
                const link = await FlutterwavePay(paydetails);
                console.log("return from flutterwave",link.data.link);
                returnobject.paymentLink = link.data.link; 
            } else {
                // pay with wallet
            }
        }
        // add payment amount to return object
        returnobject.paymentAmount = paymentamt;
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
    console.log(userId)
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

// Payment aspect of orders
const validateOrderPayment = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { tx_ref, transaction_id } = req.params;
    const { status, amount } = req.query;
    const order = await Order.findOne({ where: { id: tx_ref.split('_')[1], userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    if (order.status === 'completed') {
        throw new BadRequestError('Order already paid for');
    }
    let payobj = {
        paymentMethod: 'CARD',
        paymentReference: transaction_id,
        refId: order.id,
    }
    let validtrx;
    await sequelize.transaction(async (t) => {
    if (status === 'successful') {
        let details = { transactionId: transaction_id}
        validtrx = await validateFlutterwavePay(details);
        payobj.amount = validtrx.amount;
        payobj.paymentStatus = 'paid';
         await Payment.create({ ...payobj }, { transaction: t });
        if (order.shippingMethod === 'kship' || order.shippingMethod === 'ksecure') {
            const kship_order = await ShipbubbleOrder.findOne({ where: { orderId: order.id } });
            await kship_order.update({ status: 'processing' }, { transaction: t });
        }
    } else {
        payobj.amount = amount;
        payobj.paymentStatus = 'failed';
        await Payment.create({ ...payobj }, { transaction: t });
    }

    let message;
    if (amount !== validtrx.amount) {
        message = 'Payment amount does not match order amount';
    } else {
        message = 'Order payment validated successfully';
    }

        // send order request notification to seller

        // send order request Email to seller

        res.status(200).json({
            success: true,
            message: message,
        });
    })

});
        

// tx_ref=Klickorder_e169c91c-add9-41fb-8f3b-c4ad808360c0&transaction_id=4346320


module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    deleteOrder,
    validateOrderPayment
}