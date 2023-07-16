const {
    Product,
    User,
    Order,
    Store,
    Category,
    Cart,
    ShipbubbleOrder,
    DeliveryAddress,
    Payment,
    Wallet,
    WalletTransaction,
} = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { FlutterwavePay, validateFlutterwavePay } = require('../services/flutterwave.service');
const { SeerbitPay, validateSeerbitPay } = require('../services/seerbit.service');
const { createshipment } = require('../services/shipbubble.service');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { sendorderpushNotification } = require('../utils/mailTemplates');
const { getPagination, getPagingData } = require('../utils/pagination');
const { generateCode } = require('../utils/stringGenerators');
const Op = require('sequelize').Op;
const path = require('path');
const { validateShippingMethod, handleShippingActions, handleOrderPayment } = require('../services/order.service');

const { v4: uuidv4 } = require('uuid');

const createOrder = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { storeId } = req.query;
        const { shipMethod, option, service, shippingCourier } = req.body;

        const { shippingMethod, courier } = validateShippingMethod({ shipMethod, option, service, shippingCourier });
        console.log(shippingMethod, courier);

        const cart = await Cart.findOne({ where: { userId } });

        if (!cart) return next(new NotFoundError('Cart not found'));
        const { items, totalAmount, checkoutData } = cart;
        const cartdetails = { items, totalAmount };

        const store = await Store.findOne({
            where: { id: storeId },
            attributes: ['socials', 'name', 'logo', 'businessEmail', 'businessPhone'],
        });
        if (!store) return next(new NotFoundError('Store not found'));

        //  ==== create order ==== //
        const order = await Order.create({ userId, shippingMethod, cartdetails, storeId }, { transaction: t });
        if (!order) return next(new BadRequestError('Oops! There was an error creating your order, please try again'));

        const { returnobject, paymentamt } = await handleShippingActions({
            courier,
            order,
            store,
        });

        const requestobject = {
            ...returnobject,
        };
        if (
            (shippingMethod === 'ksecure' && checkoutData.requestToken) ||
            (shippingMethod === 'kship' && checkoutData.requestToken)
        ) {
            const paydetails = {
                amount: parseFloat(paymentamt),
                email: payload.email,
                phone: payload.phone,
                fullName: payload.fullName,
                tx_ref: `Klickorder_${order.id}`,
                srb_trx_ref: `Klickorder_${generateCode(10)}${order.id}`,
                storeName: store.name,
                storeLogo: store.logo,
                // kshipId: newShipOrder.id,
                userId,
                orderId: order.id,
                // kSecureFee: newShipOrder.kSecureFee,
                shippingFee: courier.shippingFee,
                // requestToken: newShipOrder.requestToken,
                // serviceCode: newShipOrder.courierInfo.serviceCode
            };

            const { paymentLink, trackingUrl } = await handleOrderPayment({
                option,
                service,
                paydetails,
                courier,
                checkoutData,
                order,
            });

            console.log(paymentLink, trackingUrl);

            requestobject.paymentLink = paymentLink;
            requestobject.trackingUrl = trackingUrl;
        }

        // clear cart after order is created
        await cart.update({ items: null, totalAmount: 0, checkoutData: null }, { transaction: t });

        let message;
        if (shipMethod === 'seller') {
            message = 'Order created successfully, please contact seller for payment';
        } else if (shipMethod === 'kship') {
            message = 'Order created successfully, please make payment on delivery';
        } else if (shipMethod === 'ksecure') {
            message = 'Order created successfully, please proceed to make payment';
        } else {
            message = 'Order created successfully';
        }

        return res.status(200).json({
            success: true,
            message,
            data: requestobject,
        });
    });
});

const getAllOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    console.log(userId);
    const orders = await Order.findAll({ where: { userId } });
    return res.status(200).json({
        success: true,
        data: orders,
    });
});

const getOrder = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const order = await Order.findOne({ where: { id: req.params.id, userId } });
    if (!order) {
        throw new NotFoundError('Order not found');
    }
    return res.status(200).json({
        success: true,
        data: order,
    });
});

const deleteOrder = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const order = await Order.findOne({ where: { id: req.params.id, userId } });
        if (!order) {
            throw new NotFoundError('Order not found');
        }
        await order.destroy({ transaction: t });
        return res.status(200).json({
            success: true,
            data: {},
        });
    });
});

// Payment aspect of orders for flutterwave
const validateOrderPayment = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    console.log(userId);
    // const { tx_ref, transaction_id, status } = req.query;
    console.log(req.query.tx_ref.split('_')[1]);
    const order = await Order.findOne({ where: { id: req.query.tx_ref.split('_')[1], userId } });
    if (!order) throw new NotFoundError('Order not found');

    // if (order.status === 'completed') {
    //     throw new BadRequestError('Order already paid for');
    // }
    const paymentt = await Payment.findOne({ where: { refId: order.id } });

    const details = { transactionId: req.query.transaction_id };
    let validtrx;
    await sequelize.transaction(async (t) => {
        if (req.query.status === 'successful') {
            validtrx = await validateFlutterwavePay(details);
            console.log('validtrx', validtrx);
            await Payment.update(
                {
                    paymentStatus: 'paid',
                    paymentReference: req.query.transaction_id,
                    amount: validtrx.amount === paymentt.amount ? paymentt.amount : validtrx.amount,
                },
                { where: { refId: order.id }, transaction: t },
            );

            await Order.update({ status: 'completed' }, { where: { id: order.id }, transaction: t });

            if (order.shippingMethod === 'kship' || order.shippingMethod === 'ksecure') {
                await ShipbubbleOrder.update(
                    { status: 'processing' },
                    { where: { orderId: order.id }, transaction: t },
                );
            }

            const shipbubbledetails = await ShipbubbleOrder.findOne({
                where: { orderId: order.id },
                attributes: ['requestToken', 'status', 'deliveryFee'],
            });
            console.log(
                'this is fields ====',
                shipbubbledetails.requestToken,
                shipbubbledetails.courierServiceInfo.serviceCode,
                shipbubbledetails.courierInfo.courierId,
            );
            // shipment request to kship
            const shipment = await createshipment({
                request_token: shipbubbledetails.requestToken,
                service_code: shipbubbledetails.courierServiceInfo.serviceCode,
                courier_id: shipbubbledetails.courierInfo.courierId,
            });

            await ShipbubbleOrder.update(
                {
                    status: req.query.status,
                    deliveryFee: (shipment.payment.shipping_fee = shipbubbledetails.deliveryFee
                        ? shipbubbledetails.deliveryFee
                        : shipment.payment.shipping_fee),
                    shippingReference: shipment.order_id,
                    trackingUrl: shipment.tracking_url,
                },
                { where: { orderId: order.id }, transaction: t },
            );
        } else {
            await Payment.update(
                {
                    paymentStatus: 'failed',
                    paymentReference: req.query.transaction_id,
                    amount: validtrx.amount === paymentt.amount ? paymentt.amount : validtrx.amount,
                },
                { where: { refId: order.id }, transaction: t },
            );
        }

        let message;
        console.log(validtrx.amount, paymentt.amount);
        if (paymentt.amount !== validtrx.amount) {
            message = 'Payment amount does not match order amount';
        } else {
            message = 'Order payment validated successfully';
        }
        // send order request notification to seller
        // await sendorderpushNotification({
        //     registrationToken: order.store.socials.firebaseToken,
        //     phone: order.store.phone,
        //     order: order.cartdetails,
        // });

        // send order request Email to seller

        return res.status(200).json({
            success: true,
            message,
        });
    });
});

module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    deleteOrder,
    validateOrderPayment,
};
