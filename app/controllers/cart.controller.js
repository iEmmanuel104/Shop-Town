const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingboxes, getShippingRates } = require('../services/shipbubble.service');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const convertcart = async (cart, type) => {
    const { items } = cart
    const itemIds = Object.keys(items);
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds }
    });
    let totalAmount = 0;
    console.log(products)

    if (products.length === 0) {
        throw new BadRequestError("please add a vlaid product to cart");
    }

    products.forEach(product => {
        let cartquantity;
        if (type === 'get') {
            cartquantity = items[product.id].quantity;
        } else {
            cartquantity = items[product.id];
        }
        const brandId = product.brandId
        if (cartquantity >= 1) {
            const price = product.discountedPrice ? product.discountedPrice : product.price;
            const inStock = product.quantity.instock;
            const itemStatus = inStock >= cartquantity ? 'instock' : 'outofstock';

            items[product.id] = {
                name: product.name,
                quantity: cartquantity,
                UnitPrice: product.price,
                discount: product.discount,
                Discountprice: price,
                status: itemStatus,
                store: brandId,
            };
            if (itemStatus === 'instock') {
                totalAmount += price * cartquantity
            }
        }
    });

    cart.totalAmount = totalAmount;
    return cart
}

const storeCart = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const { items } = req.body;
        if (!items) {
            return next(new BadRequestError("Items not found"));
        }

        const cart = { items }
        console.log(items)
        const converted = await convertcart(cart)
        console.log(converted)

        const newCart = await Cart.create({
            // userId: null,
            items: converted.items,
            totalAmount: converted.totalAmount
        });
        res.status(200).json({
            success: true,
            data: newCart
        });
    });
});

const getCart = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const cart = await Cart.findOne({
            where: {
                id: req.params.id,
            }
        });
        if (!cart) {
            return res.status(200).json({
                success: true,
                data: {}
            });
        }
        if (!cart.items) {
            cart.items = {}; // initialize items as empty object if null
        }

        if (cart) {

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
        }
        else if (!cart && cart.items.length == 0) {
            res.status(200).json({
                success: true,
                data: {}
            });
        }
    });
});

const updateCart = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const { id } = req.params;
        const { items } = req.body;
        const cart = await Cart.findOne({
            where: {
                id: id
            }
        });
        if (cart) {
            const updatedCart = { items }
            console.log(items)
            const converted = await convertcart(updatedCart)
            cart.items = converted.items;
            cart.totalAmount = converted.totalAmount;
            await cart.save({ transaction: t });
            
            res.status(200).json({
                success: true,
                message: "Cart Updated Succesfully",
            });
        }
        else {
            res.status(200).json({
                success: true,
                message: "Cart not found",
                data: {}
            });
        }
    });
});

const deleteCart = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const { id } = req.params;
        const cart = await Cart.findOne({
            where: {
                id: id
            }
        });
        if (cart) {
            await cart.destroy();
            res.status(200).json({
                success: true,
                message: "Cart deleted",
                data: {}
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

const cartcheckout = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded
        const { id } = req.params;
        // if (decoded.vendorMode) {
        //     throw new ForbiddenError("Plesae switch to customer mode to checkout");
        // }

        const cart = await Cart.findOne({
            where: { id }
        });
        // console.log(cart.toJSON())
        if (cart) {
            // update the cart with the user id
            cart.userId = decoded.id;

            console.log(cart.toJSON())
            const converted = await convertcart(cart, 'get')
            console.log(converted.toJSON() )
            // update the cart with the converted items and totalAmount
            cart.items = converted.items;
            cart.totalAmount = converted.totalAmount;

            // categorise itens by brand
            const groupedCartItems = await groupCartItems(cart.items, cart.totalAmount);
            const storeId = {
                id: Object.keys(groupedCartItems)[0],
                type: 'store'
            };
            console.log(groupedCartItems)
            const userId = { id: decoded.id };

            let sender_address_code, receiver_address_code, pickup_date, category_id, package_items, package_dimension, description;

            // Get sender and user address codes 
            sender_address_code = (await DeliveryAddress.scope({ method: ["Default", storeId] }).findOne()).addressCode;
            receiver_address_code = (await DeliveryAddress.scope({ method: ["Default", userId] }).findOne()).addressCode;
            // pickup_date = new Date().toISOString().split('T')[0];
            pickup_date = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().split('T')[0];
            category_id = groupedCartItems[storeId.id][0].specification.shippingcategory_id;
            package_items = groupedCartItems[storeId.id].map(item => {
                const weightsum = item.quantity * item.specification.weight;
                return {
                    name: item.name,
                    description: item.description,
                    unit_weight: item.specification.weight,
                    unit_amount: item.Discountprice ,
                    quantity: item.quantity,
                    total_weight: weightsum
                }
            });

            const boxSizes = (await getshippingboxes()).data;
            package_dimension = await estimateBoxDimensions(package_items, boxSizes);
            description = package_dimension.description 
                        ? `Please handle with care as ${package_dimension.description}` :
                         `Please handle with care and do not shake`;

            const details = {
                sender_address_code,
                receiver_address_code,
                pickup_date,
                category_id,
                package_items,
                package_dimension,
                delivery_instructions: description
            }
             // GET SHIPPING FEE FROM SHIPBUBBLE API
            const {request_token, cheapest_courier, checkout_data } = await getShippingRates(details);

            console.log (request_token, cheapest_courier, checkout_data)

            // update cart checkout data
            cart.checkoutData = { request_token, cheapest_courier, checkout_data }

            await cart.save( { transaction: t });

            // CREATE A NEW ORDER INSTANCE

            res.status(200).json({
                success: true,
                message: "Proceed to choose a suitable shipping method",
                data: cart,
                courier: cheapest_courier.total
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

const groupCartItems = async (items, amt) => {
    const itemIds = Object.keys(items);

    // Retrieve products based on itemIds
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds },
        attributes: ['id', 'name', 'specifications', 'description'],
    });

    if (products.length === 0) {
        throw new BadRequestError("Please add a valid product to cart");
    }

    let groupedItems = {};
    Object.values(items).forEach(item => {
        const productId = Object.keys(items).find(key => items[key] === item);
        const product = products.find(product => product.id === productId);
        console.log(product)
        const { name, specifications, description } = product;

        const newItem = {
            ...item,
            productId, // Add the productId to the newItem
            name,
            specification: specifications,
            description
        };

        if (groupedItems[item.store]) {
            groupedItems[item.store].push(newItem);
        } else {
            groupedItems[item.store] = [newItem];
        }
    });

    groupedItems.totalAmount = amt;
    return groupedItems;
};

const estimateBoxDimensions = async (items, boxSizes) => {
    // Calculate the accumulated weight of all items
    const accumulatedWeight = await items.reduce((sum, item) => sum + item.total_weight, 0);

    // Extract the boxes with their names and weights from boxSizes array
    const filtered = await boxSizes.filter(box => box.max_weight >= accumulatedWeight)
    const suitableMaxWeights = await filtered.map(box => ({
        name: box.name,
        weight: box.max_weight
    }));

    // check if the filtered array is empty
    let selectedBox
    if (filtered.length === 0) {
        // get box with highest volume
        const maxfilter = await boxSizes.reduce((max, box) => {
            const volume = box.height * box.width * box.length;
            return volume > max.volume ? { volume, box } : max;
        } , { volume: 0, box: null });

        selectedBox = maxfilter.box;
    } else {
        const closestWeight = await suitableMaxWeights.reduce((closest, weight) => {
            const weightDifference = Math.abs(weight.weight - accumulatedWeight);
            const closestDifference = Math.abs(closest.weight - accumulatedWeight);
            return weightDifference < closestDifference ? weight : closest;
        });

        // Find the box with the closestWeight in the boxSizes array
        selectedBox = await boxSizes.find(box => box.name === closestWeight.name && box.max_weight === closestWeight.weight);
    }

    // Return the dimensions of the selected box
    const dimensions = {
        height: selectedBox.height,
        width: selectedBox.width,
        length: selectedBox.length
    };

    // Add description if the max box or shipping container is being used
    if (filtered.length === 0) {
        dimensions.description = 'item size exceeds all available boxes, max boxsize used';
    }

    return dimensions;
};


module.exports = {
    convertcart,
    storeCart,
    getCart,
    updateCart,
    deleteCart,
    cartcheckout
}