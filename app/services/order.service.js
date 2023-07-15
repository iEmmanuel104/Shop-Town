const { Order, ShipbubbleOrder, Wallet } = require('../../models');
const { KSECURE_FEE } = require('../utils/configs');
const { FlutterwavePay, validateFlutterwavePay } = require('../services/flutterwave.service');
const { SeerbitPay, validateSeerbitPay } = require('../services/seerbit.service');
const { createshipment } = require('../services/shipbubble.service');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { sendorderpushNotification } = require('../utils/mailTemplates');
const { getPagination, getPagingData } = require('../utils/pagination');
const { generateCode } = require('../utils/stringGenerators');

const validateShippingMethod = ({ shipMethod, option, service, shippingCourier }) => {
    const validShippingMethods = ['seller', 'kship', 'ksecure'];
    if (!validShippingMethods.includes(shipMethod)) {
        throw new BadRequestError('Invalid shipping method');
    }

    // Check ship method
    let courier;

    // Case 1: Seller
    if (shipMethod === 'seller') {
        if (option || service || shippingCourier) {
            throw new BadRequestError('Invalid inputs for seller shipping method');
        }
    }

    // Case 2: Kship or Ksecure
    if (shipMethod === 'kship' || shipMethod === 'ksecure') {
        if (!shippingCourier) {
            throw new BadRequestError(`Invalid inputs for ${shipMethod} shipping method, choose a courier`);
        }
        courier = shippingCourier;

        // Check courier ID and service code
        let { courierId, serviceCode, courierName, cod, total } = courier;
        if (!courier || !courierId || !serviceCode || !courierName || !cod || !total) {
            throw new BadRequestError('Invalid shipping courier details');
        }

        // Validate service option
        const validServiceOptions = ['card', 'kcredit', 'cash'];
        if (!validServiceOptions.includes(option)) {
            throw new BadRequestError('Invalid service option');
        }

        // Validate service
        if (option === 'card') {
            const validServices = ['flutterwave', 'seerbit'];
            if (!validServices.includes(service)) {
                throw new BadRequestError('Invalid payment service');
            }
        }
    }

    return { shippingMethod: shipMethod, courier };
};

const handleShippingActions = async ({ order, store, courier }) => {
    let orderobj = {
            orderId: order.id,
            orderstatus: order.status,
            orderdate: order.createdAt,
            orderamount: order.cartdetails.totalAmount,
            userId: order.userId,
            storeId: order.storeId,
            orderNumber: order.orderNumber,
            shippingMethod: order.shippingMethod,
        },
        socials = {
            links: store.socials,
            phone: store.businessPhone,
            email: store.businessEmail,
        },
        shipMethod = order.shippingMethod,
        paymentamt = parseFloat(orderobj.orderamount);
    let returnobject = {
        order: orderobj,
        socials,
        subTotal: orderobj.orderamount,
        paymentAmount: paymentamt,
        shippingMethod: shipMethod,
    };

    if (shipMethod === 'seller') {
        // send order request notification to seller
    } else if (shipMethod === 'kship') {
        returnobject.deliveryFee = courier.total;
        paymentamt += parseFloat(courier.total);
    } else if (shipMethod === 'ksecure') {
        returnobject.deliveryFee = courier.total;
        returnobject.kSecureFee = parseFloat(KSECURE_FEE);
        paymentamt += parseFloat(courier.total) + parseFloat(KSECURE_FEE);
    } else {
        throw new BadRequestError('Invalid shipping method');
    }

    return { returnobject, paymentamt };
};

const handleOrderPayment = async ({ option, service, paydetails, courier, checkoutData, order }) => {
    let shippingObject = {
        orderId: order.id,
        courierInfo: { ...courier },
        requestToken: checkoutData.requestToken,
        serviceType: service, // flutterwave or seerbit
        shippingMethod: order.shippingMethod, // kship or ksecure or seller
    };

    let paymentLink, trackingUrl, deliveryFee;

    if (option === 'card') {
        console.log('card payment');
        let link;
        if (service === 'flutterwave') {
            console.log('flutterwave payment');

            linkobj = await FlutterwavePay(paydetails);
            link = linkobj.data.link;
        } else if (service === 'seerbit') {
            console.log('seerbit payment');

            // SEERBIT payment
            link = await SeerbitPay(paydetails);
        } else {
            throw new BadRequestError('Invalid payment service');
        }

        // returns payment link, paystatus
        paymentLink = link;
    } else if (option === 'cash') {
        console.log('cash payment');

        // cash on delivery service
        if (!courier.cod) throw new BadRequestError('Select a courier that accepts cash on delivery');

        // pay on delivery
        const { deliveryFee, trackingUrl } = await order.createShipment(shippingObject);
        trackingUrl = trackingUrl;
    } else if (option === 'kcredit') {
        console.log('kcredit payment');

        let amount = order.cartdetails.totalAmount;

        // pay with wallet
        const wallet = await Wallet.findOne({ where: { userId }, attributes: ['id', 'amount'] });
        if (!wallet) return next(new NotFoundError('Wallet not found'));

        if (wallet.amount < amount) throw new BadRequestError('Insufficient wallet balance');

        await Wallet.decrement('amount', { by: amount, where: { id: wallet.id } });

        wallet.updateOrderStatus({ orderId: order.id, status: 'active' });

        const { deliveryFee, trackingUrl } = await order.createShipment(shippingObject);
        trackingUrl = trackingUrl;
    }

    return { paymentLink, trackingUrl };
};

module.exports = {
    validateShippingMethod,
    handleShippingActions,
    handleOrderPayment,
};
