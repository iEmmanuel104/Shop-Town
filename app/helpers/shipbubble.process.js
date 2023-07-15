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
    let sender_address_code,
        receiver_address_code,
        pickup_date,
        category_id,
        package_items,
        package_dimension,
        description,
        boxSizes;

    sender_address_code = senderAddress?.addressCode;
    if (!sender_address_code) return next(new NotFoundError('Store validation pending'));

    receiver_address_code = receiverAddress?.addressCode;
    if (!receiver_address_code) return next(new NotFoundError('Please add a delivery address'));

    pickup_date = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().split('T')[0]; // set pickup date to UTC + 1 hour

    package_items = converted.items.map((item) => {
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

    boxSizes = (await getshippingboxes()).data;
    const { dimensions, package_category } = await estimateBoxDimensions(package_items, boxSizes);
    package_dimension = dimensions;
    category_id = package_category; // get category id from first item in cart
    description = package_dimension.description
        ? `Please handle with care as ${package_dimension.description}`
        : `Please handle with care and do not shake`;

    const details = {
        sender_address_code,
        receiver_address_code,
        pickup_date,
        category_id,
        package_items,
        package_dimension,
        delivery_instructions: description,
    };
    console.log('details', details);

    const { request_token, allcouriers, kship_courier, cheapest_courier, checkout_data } = await getShippingRates(
        details,
    );

    if (request_token) {
        await cart.update({
            checkoutData: { requestToken: request_token, valid: true, checkoutDetails: JSON.stringify(checkout_data) },
        });
    }

    return { allcouriers, checkout_data };
}

module.exports = {
    checkoutWithShipbubble,
};
