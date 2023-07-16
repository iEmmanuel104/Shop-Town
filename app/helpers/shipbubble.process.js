const e = require('express');
const { Product, User, Store, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingboxes, getShippingRates } = require('../services/shipbubble.service');
const { KSECURE_FEE } = require('../utils/configs');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { convertcart, checkCartStore, estimateBoxDimensions } = require('../utils/carthelpers');
const { getPagination, getPagingData } = require('../utils/pagination');
const Op = require('sequelize').Op;
const path = require('path');

async function checkoutWithShipbubble({ cart, converted, senderAddress, receiverAddress }) {
    const senderAddressCode = senderAddress?.addressCode;
    if (!senderAddressCode) throw new NotFoundError('Store validation pending');

    const receiverAddressCode = receiverAddress?.addressCode;
    if (!receiverAddressCode) throw new NotFoundError('Please add a delivery address');

    const pickupDate = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().split('T')[0]; // set pickup date to UTC + 1 hour

    const packageItems = converted.items.map((item) => {
        const weightsum = item.count * item.info.weight;
        return {
            name: item.info.name,
            description: item.info.description,
            unit_weight: item.info.weight,
            unit_amount: item.info.Discountprice,
            quantity: item.count,
            category: item.info.category,
            total_weight: weightsum,
        };
    });

    const boxSizes = (await getshippingboxes()).data;
    const { dimensions, packageCategory } = await estimateBoxDimensions(packageItems, boxSizes);
    const packageDimension = dimensions;
    const categoryId = packageCategory; // get category id from first item in cart
    const description = packageDimension.description
        ? `Please handle with care as ${packageDimension.description}`
        : `Please handle with care and do not shake`;

    const details = {
        senderAddressCode,
        receiverAddressCode,
        pickupDate,
        categoryId,
        packageItems,
        packageDimension,
        description,
    };
    console.log('details', details);

    const { requestToken, allcouriers, kshipourier, cheapestCourier, checkoutData } = await getShippingRates(details);

    if (requestToken) {
        await cart.update({
            checkoutData: { requestToken, valid: true, checkoutDetails: JSON.stringify(checkoutData) },
        });
    }

    return { allcouriers, checkoutData };
}

module.exports = {
    checkoutWithShipbubble,
};
