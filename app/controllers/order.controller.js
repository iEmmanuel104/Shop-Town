const { Product, User, Order, Brand, Category, Cart, ShipbubbleOrder, DeliveryAddress, Payment, Wallet, WalletTransaction } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { FlutterwavePay, validateFlutterwavePay } = require('../services/flutterwave.service');
const { SeerbitPay, validateSeerbitPay } = require('../services/seerbit.service');
const { createshipment } = require('../services/shipbubble.service');
const { KSECURE_FEE } = require('../utils/configs');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { sendorderpushNotification } = require('../utils/mailTemplates');
const { getPagination, getPagingData } = require('../utils/pagination')
const { generateCode } = require('../utils/StringGenerator')
const Op = require("sequelize").Op;
const path = require('path');

const { v4: uuidv4 } = require('uuid');

const createOrder = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const userInfo = await User.findOne({ where: { id: userId } });
        const { shipping_method, storeId, option, service } = req.body;

        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) throw new NotFoundError('Cart not found');
        let checkoutData = JSON.parse(cart.checkoutData);

        const validShippingMethods = ['seller', 'kship', 'ksecure'];
        if (!validShippingMethods.includes(shipping_method)) {
            throw new BadRequestError('Invalid shipping method');
        }        
        let shippingMethod = { type: shipping_method }
        // cartdetails for order
        let courier = checkoutData.cheapest_courier
        if (shipping_method === 'kship' && option === 'cash') { 
            courier = checkoutData.kship_courier ? checkoutData.kship_courier : checkoutData.cheapest_courier
         }

        let cartdetails = { items: cart.items, totalAmount: cart.totalAmount }

        const store = await Brand.findOne({ where: { id: storeId }, attributes: ['socials', 'name', 'logo'] })
        if (!store) throw new NotFoundError('Store not found');

        let order, socials, kship_order, shippingObject, returnobject, orderobj;

        socials = store.socials ? store.socials : store.businessPhone;

        //  ==== create order ==== //
        order = await Order.create({ userId,  shippingMethod, cartdetails, storeId }, { transaction: t });

        orderobj = {
            orderId: order.id, orderstatus: order.status, orderdate: order.createdAt,
            orderamount: order.cartdetails.totalAmount, userId: order.userId,
            storeId: order.storeId, orderNumber: order.orderNumber, shippingMethod: order.shippingMethod
        }

        let { courier_id, courier_name, is_cod_available, waybill, courier_image, 
            service_type, service_code, insurance, discount, total } = courier; 


        shippingObject = {
            orderId: order.id, 
            courierInfo: { courierId: courier_id, courierName: courier_name, courierImage: courier_image },
            courierServiceInfo: { serviceType: service_type, serviceCode: service_code, isCodAvailable: is_cod_available, waybill },
            courierBenefits: { insurance, discount },    
            requestToken: checkoutData.request_token, 
            deliveryFee: total, 
            checkoutData: checkoutData.checkout_data,
        }

        returnobject = { order: orderobj, socials, subTotal: cartdetails.totalAmount }

        let paymentamt = parseFloat(cartdetails.totalAmount);

        // ==== sepearate shipping method ==== //

        if (shipping_method === 'seller') {
            // send order request notification to seller
        } else if (shipping_method === 'kship') {

            kship_order = await ShipbubbleOrder.create(shippingObject, { transaction: t });
            returnobject.deliveryFee = kship_order.deliveryFee;
            // returnobject.kship_order = kship_order;
            paymentamt += parseFloat(courier.total);

        } else if (shipping_method === 'ksecure') {

            kship_order = await ShipbubbleOrder.create({
                ...shippingObject,
                isKSecure: true,
                kSecureFee: parseFloat(KSECURE_FEE),
            }, { transaction: t });
            returnobject.deliveryFee = kship_order.deliveryFee;
            returnobject.kSecureFee = parseFloat(KSECURE_FEE);
            paymentamt += parseFloat(courier.total) + parseFloat(KSECURE_FEE);

        } else {
            throw new BadRequestError('Invalid shipping method');
        }

        console.log("kship_order===",kship_order.requestToken)

        // 
        if (kship_order && kship_order.requestToken) {
            const paydetails = {
                amount: parseFloat(paymentamt), email: userInfo.email, phone: userInfo.phone,
                fullName: userInfo.fullName, tx_ref: `Klickorder_${order.id}`,
                srb_trx_ref: `Klickorder_${generateCode(10)}${order.id}`, storeName: store.name,
                storeLogo: store.logo, kshipId: kship_order ? kship_order.id : null,
                isKSecure: kship_order ? kship_order.isKSecure : false, orderId : order.id,
                kSecureFee: kship_order ? kship_order.kSecureFee : null,
                shippingfee: kship_order ? kship_order.deliveryFee : null,
            }

            if (option === 'card') {
                let link; 
                if (service === 'FLUTTERWAVE') {
                    linkobj = await FlutterwavePay(paydetails);
                    // console.log("return from flutterwave", linkobj.data.link);
                    link = linkobj.data.link;
                } else if (service === 'SEERBIT') {
                    // SEERBIT payment
                    // console.log(await SeerbitPay(paydetails));
                    link = await SeerbitPay(paydetails);
                } else { throw new BadRequestError('Invalid payment service') }
                console.log("link===",link)
                
                returnobject.paymentLink = link;
                await Payment.create({
                    refId: order.id,
                    amount: paymentamt,
                    paymentMethod: "card",
                    serviceType: service,
                }, { transaction: t });

            } else if (option === 'kcredit') {
                // pay with wallet
                const wallet = await Wallet.findOne({ where: { userId } });
                if (!wallet) throw new NotFoundError('Wallet not found');
                if (wallet.amount < paymentamt) throw new BadRequestError('Insufficient wallet balance');
                
                await WalletTransaction.create({
                    walletId: wallet.id,  amount: paymentamt,
                    reference: `KCREDIT_${order.id}`,  status: 'success',
                    type: 'debit',  description: 'Payment for order',
                }, { transaction: t });

                await Wallet.decrement('amount', { by: paymentamt, where: { id: wallet.id }, transaction: t });
                await Order.update({ status: 'completed' }, { where: { id: order.id }, transaction: t });
                await Payment.create({ refId: order.id, amount: paymentamt, paymentMethod: "kcredit" }, { transaction: t });
            } else if (option === 'cash' && shipping_method === 'kship') {
                // pay on delivery
                // shipment request to kship
                const { order_id, status, payment, tracking_url } = await createshipment({
                    request_token: kship_order.requestToken,
                    service_code: kship_order.courierServiceInfo.serviceCode,
                    courier_id: kship_order.courierInfo.courierId,
                }, { transaction: t });

                console.log("tracking_url===",tracking_url) 
                await ShipbubbleOrder.update({
                    status: status,
                    deliveryFee: payment.shipping_fee = kship_order.deliveryFee ? kship_order.deliveryFee : payment.shipping_fee,
                    shippingReference: order_id,
                    trackingUrl: tracking_url
                }, { where: { orderId: order.id }, transaction: t });
                returnobject.TrackingUrl = tracking_url;
                await Order.update({ status: 'pending' }, { where: { id: order.id }, transaction: t });
                await Payment.create({ refId: order.id, amount: paymentamt, paymentMethod: "cash" }, { transaction: t });
            }
        }
        // add payment amount to return object
        returnobject.paymentAmount = paymentamt;
        // const orderInfo = await Order.scope('includeStore').findOne({ where: { id: order.id } });

        // await Cart.destroy({ where: { userId }, transaction: t });
        let message;
        if (shipping_method === 'seller') {
            message = 'Order created successfully, please contact seller for payment';
        } else if (shipping_method === 'kship') {
            message = 'Order created successfully, please make payment on delivery';
        } else if (shipping_method === 'ksecure') {
            message = 'Order created successfully, please proceed to make payment';
        } else {
            message = 'Order created successfully';
        }

        return res.status(200).json({
            success: true,
            message: message,
            data: returnobject
        });
    })
});

const getAllOrders = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    console.log(userId)
    const orders = await Order.findAll({ where: { userId } });
    return res.status(200).json({
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
    return res.status(200).json({
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
        return res.status(200).json({
            success: true,
            data: {}
        });
    })
})

// Payment aspect of orders for flutterwave
const validateOrderPayment = asyncWrapper(async (req, res) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    console.log(userId)
    const { tx_ref, transaction_id, status } = req.query;
    console.log(tx_ref.split('_')[1])
    const order = await Order.findOne({ where: { id: tx_ref.split('_')[1], userId } });
    if (!order) throw new NotFoundError('Order not found');
    
    // if (order.status === 'completed') {
    //     throw new BadRequestError('Order already paid for');
    // }
    const paymentt = await Payment.findOne({ where: { refId: order.id } });

    let details = { transactionId: transaction_id }
    let validtrx;
    await sequelize.transaction(async (t) => {
        if (status === 'successful') {
            validtrx = await validateFlutterwavePay(details);
            console.log("validtrx",validtrx)
            await Payment.update({
                paymentStatus: 'paid',
                paymentReference: transaction_id,
                amount: validtrx.amount === paymentt.amount 
                ?  paymentt.amount 
                : validtrx.amount
            }, { where: { refId: order.id }, transaction: t });

            await Order.update({ status: 'completed' }, { where: { id: order.id }, transaction: t });


            if (order.shippingMethod === 'kship' || order.shippingMethod === 'ksecure') {
                const kship_order = await ShipbubbleOrder.findOne({ where: { orderId: order.id } });
                await kship_order.update({ status: 'processing' }, { transaction: t });
            }

            const shipbubbledetails = await ShipbubbleOrder.findOne({ where: { orderId: order.id },
                attributes: ['requestToken', 'status', 'deliveryFee'] });
                console.log ( "this is fields ====",
                    shipbubbledetails.requestToken,
                    shipbubbledetails.courierServiceInfo.serviceCode,
                    shipbubbledetails.courierInfo.courierId,
                )
            // shipment request to kship
            const {order_id, status, payment, tracking_url} = await createshipment({
                request_token: shipbubbledetails.requestToken,
                service_code: shipbubbledetails.courierServiceInfo.serviceCode,
                courier_id: shipbubbledetails.courierInfo.courierId,
            });

            console.log(order_id, status, payment, tracking_url)

            await ShipbubbleOrder.update({
                status: status,
                deliveryFee: payment.shipping_fee = shipbubbledetails.deliveryFee ? shipbubbledetails.deliveryFee : payment.shipping_fee,
                shippingReference: order_id,
                trackingUrl: tracking_url
            }, { where: { orderId: order.id }, transaction: t });

        } else {

            await Payment.update({
                paymentStatus: 'failed',
                paymentReference: transaction_id,
                amount: validtrx.amount === paymentt.amount ?  paymentt.amount : validtrx.amount
            }, { where: { refId: order.id }, transaction: t });
        }

        let message;
        console.log(validtrx.amount, paymentt.amount)
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
            message: message,
        });
    })

});


module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    deleteOrder,
    validateOrderPayment
}