const e = require('express');
const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingboxes, getShippingRates } = require('../services/shipbubble.service');
const { KSECURE_FEE } = require('../utils/configs');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { convertcart, groupCartItems, estimateBoxDimensions } = require('../utils/carthelpers');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const storeCart = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { items } = req.body;
        const decoded = req.decoded;
        const userId = decoded.id;
        const usercart = await Cart.findOne({
            where: {
                userId: userId,
                isWishList: false
            }
        });

        if (!items) {
            return next(new BadRequestError("Items not found"));
        }

        const cart = { items }
        const converted = await convertcart(cart)

        const newCart = await Cart.create({
            // userId: null,
            items: converted.items,
            totalAmount: converted.totalAmount,
            isWishList: true,
        });

        // Associate the cart with the user
        await usercart.addChild(newCart, { transaction: t })

        // save wishli
        res.status(200).json({
            success: true,
            data: newCart
        });
    });
});

const getCart = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const cart = await Cart.findOne({ where: { id: req.params.id },
            // remove checkoutData from cart
            attributes: { exclude: ['checkoutData'] }
         });

        if (!cart) return next(new NotFoundError("Cart not found"));
        if (!cart.items) { cart.items = {}; }// initialize items as empty object if null

        if (cart.items.length === 0 || cart.items == {} || cart.items == null || cart.totalAmount == 0) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty",
                data: {}
            });
        }
        // check if the product pice and quantity has changed
        const converted = await convertcart(cart, 'get')
        
        // compare the converted items and totalAmount to the original cart
        if (
            JSON.stringify(cart.items) !== JSON.stringify(converted.items) ||
            cart.totalAmount !== converted.totalAmount
        ) {
            cart.items = converted.items;
            cart.totalAmount = converted.totalAmount;
            await cart.save({ transaction: t });
        }

        res.status(200).json({
            success: true,
            data: cart
        });
    });
});

const updateCart = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { id } = req.params;
        const { items } = req.body;

        const cart = await Cart.findOne({ where: { id: id } });

        let updatefields = {}, message = "", cartitems = {}
        if (!cart) return next(new NotFoundError("Cart not found"));

        const updatedCart = { items }
        let checkcart = updatedCart.items

        // console.log("checkcart", checkcart)

        if (!items || Object.keys(checkcart).length === 0) {
            cartitems = { items: {}, totalAmount: 0 }
            message = "Cart is Emptied"
        } else {
            const converted = await convertcart(updatedCart)
            updatefields = {
                analytics: converted.analytics,
                // totalAmount: converted.totalAmount,
            }

            cartitems = {
                items: converted.items,
                totalAmount: converted.totalAmount,
            }

            if (converted.errors.length > 0) {
                updatefields.errors = converted.errors
                updatefields.processedcount = (converted.items).length // number of items processed
            }
            message = "Cart Updated Succesfully"
        }

        await cart.update(cartitems, { transaction: t });

        res.status(200).json({
            success: true,
            message,
            data: { ...updatefields }
        });
    });
});

const deleteCart = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { id } = req.params;
        const cart = await Cart.findOne({ where: { id: id } });

        if (!cart) return next(new NotFoundError("Cart not found"));

        if (cart.isWishList === false) return next(new ForbiddenError("You can't delete a main cart only a wishlist cart"));

        await cart.destroy();
        res.status(200).json({
            success: true,
            message: "Cart deleted",
            data: {}
        });
    });
});

const cartcheckout = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded
        // const { id } = req.params;
        // if (decoded.vendorMode) {
        //     throw new ForbiddenError("Plesae switch to customer mode to checkout");
        // }

        const userId = decoded.id;
        console.log("userId", userId)

        const cart = await Cart.findOne({
            where: { userId: userId, isWishList: false }
        });

        if (cart) {
            const converted = await convertcart(cart, 'get')

            // update the cart with the converted items and totalAmount
            cart.items = converted.items;
            cart.totalAmount = converted.totalAmount;

            // categorise itens by store
            const groupedCartItems = await groupCartItems(cart.items, cart.totalAmount);
            console.log("grouped =========== ",groupedCartItems)
            const storeId = {
                id: Object.keys(groupedCartItems)[0],
                type: 'store'
            };

            const userobj = {   
                id: userId,
                type: 'user'
            };

            let sender_address_code, receiver_address_code, pickup_date,
                category_id, package_items, package_dimension, description, boxSizes;

            // Get sender and user address codes 
            sender_address_code = (await DeliveryAddress.scope({ method: ["Default", storeId] }).findOne()).addressCode;
            if (!sender_address_code) return next(new NotFoundError("Store validation pending"));

            receiver_address_code = (await DeliveryAddress.scope({ method: ["Default", userobj] }).findOne()).addressCode;
            if (!receiver_address_code) return next(new NotFoundError("Please add a delivery address"));

            // pickup_date = new Date().toISOString().split('T')[0];
            pickup_date = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().split('T')[0]; // add 1 hour to current time
            category_id = groupedCartItems[storeId.id][0].specification.shippingcategory_id;
            package_items = groupedCartItems[storeId.id].map(item => {
                const weightsum = item.quantity * item.specification.weight;
                return {
                    name: item.name,
                    description: item.description,
                    unit_weight: item.specification.weight,
                    unit_amount: item.Discountprice,
                    quantity: item.quantity,
                    total_weight: weightsum
                }
            });

            boxSizes = (await getshippingboxes()).data;
            package_dimension = await estimateBoxDimensions(package_items, boxSizes);
            description = package_dimension.description
                ? `Please handle with care as ${package_dimension.description}` :
                `Please handle with care and do not shake`;

            const details = {
                sender_address_code, receiver_address_code, pickup_date,
                category_id, package_items, package_dimension,
                delivery_instructions: description
            }
            // GET SHIPPING FEE FROM SHIPBUBBLE API
            const { request_token, kship_courier, cheapest_courier, checkout_data } = await getShippingRates(details);

            console.log(request_token, kship_courier, cheapest_courier, checkout_data)

            // update cart checkout data
            cart.checkoutData = { request_token, kship_courier, cheapest_courier, checkout_data }

            await cart.save({ transaction: t });

            // CREATE A NEW ORDER INSTANCE

            res.status(200).json({
                success: true,
                message: "Proceed to choose a suitable shipping method",
                // data: cart,
                kship_fee: kship_courier.total ? parseFloat(kship_courier.total) : cheapest_courier.total,
                ksecure_fee: parseFloat(KSECURE_FEE) + cheapest_courier.total,
            });
        }
        else {
            res.status(200).json({
                success: true,
                data: {}
            });
        }
    });
});


module.exports = {
    convertcart,
    storeCart,
    getCart,
    updateCart,
    deleteCart,
    cartcheckout
}