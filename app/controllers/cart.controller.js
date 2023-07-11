const e = require('express');
const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingboxes, getShippingRates } = require('../services/shipbubble.service');
const { KSECURE_FEE } = require('../utils/configs');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { convertcart, checkCartStore, estimateBoxDimensions } = require('../utils/carthelpers');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const storeCart = asyncWrapper(async (req, res, next) => {
  const { items } = req.body;
  const { id: userId } = req.decoded;

  const validateCartAndItems = async () => {
    const userCart = await Cart.findOne({
      where: { userId: userId, isWishList: false },
      include: [{
        model: Cart,
        as: 'Wishlists',
        attributes: ['id'],
      }]
    });

    if (!userCart) {
      throw new BadRequestError("Cart not found: please verify your account");
    }

    if (!items || !Array.isArray(items)) {
      throw new BadRequestError(
        "Please provide items as an array of objects"
      );
    }

    return userCart;
  };

  await sequelize.transaction(async (t) => {
    const userCart = await validateCartAndItems();

    const wishlists = await Cart.findAll({
      where: {
        id: userCart.Wishlists.map((wishlist) => wishlist.id)
      }
    });

    let message;

    if (wishlists.length === 0) {
      const wishlistCart = await Cart.create(
        {
          items,
          isWishList: true,
          parentId: userCart.id // Set the parent cart ID
        },
        { transaction: t }
      );

      await userCart.addChild(wishlistCart, { transaction: t });

      message = "Wishlist created successfully";
    } else {
      await Cart.update(
        { items: items },
        {
          where: {
            id: wishlists[0].id,
          },
          transaction: t,
        }
      );

      message = "Wishlist updated successfully";
    }

    res.status(200).json({
      success: true,
      message: message,
    });
  });
});

const getCart = asyncWrapper(async (req, res, next) => {
  await sequelize.transaction(async (t) => {
    const cart = await Cart.findOne({
      where: { id: req.params.id },
      // remove checkoutData
      attributes: { exclude: ['checkoutData'] }
    });

    if (!cart) return next(new NotFoundError("Cart not found"));

    if (cart.items == null) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: {}
      });
    }
    // check if the product pice and quantity has changed
    const converted = await convertcart(cart)

    return res.status(200).json({
      success: true,
      data: { ...converted.toJSON() }
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

    if (!items || checkcart.length === 0) {
      cartitems = { items: null, totalAmount: 0 }
      message = "Cart is Emptied"
    } else {
      const converted = await convertcart(updatedCart)
      updatefields = {
        analytics: converted.analytics,
      }

      cartitems = {
        items: converted.items,
        totalAmount: converted.totalAmount,
      }

      if (converted.errors.length > 0) {
        updatefields.errors = converted.errors
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
    });
  });
});

const cartcheckout = asyncWrapper(async (req, res, next) => {
  const decoded = req.decoded;
  const userId = decoded.id;
  console.log("userId", userId);

  const cart = await Cart.findOne({
    where: { userId: userId, isWishList: false },
  });

  if (!cart) return next(new NotFoundError("Cart not found"));

  if (cart.items != null && cart.items.length > 0) {
    const converted = await convertcart(cart, "checkout");

    // categorise items by store
    const cartStore = await checkCartStore(cart.items);
    const storeId = { id: cartStore.store, type: "store" };
    const userobj = { id: userId, type: "user" };

    let sender_address_code,
      receiver_address_code,
      pickup_date,
      category_id,
      package_items,
      package_dimension,
      description,
      boxSizes;

    // Get sender and user address codes
    const [senderAddress, receiverAddress] = await Promise.all([
      DeliveryAddress.scope({ method: ["Default", storeId] }).findOne(),
      DeliveryAddress.scope({ method: ["Default", userobj] }).findOne(),
    ]);

    sender_address_code = senderAddress?.addressCode;
    if (!sender_address_code) return next(new NotFoundError("Store validation pending"));

    receiver_address_code = receiverAddress?.addressCode;
    if (!receiver_address_code) return next(new NotFoundError("Please add a delivery address"));

    pickup_date = new Date(new Date().getTime() + 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]; // set pickup date to UTC + 1 hour 

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
    const { dimensions, package_category } = await estimateBoxDimensions(
      package_items,
      boxSizes
    );
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
    console.log("details", details);

    const {
      request_token,
      allcouriers,
      kship_courier,
      cheapest_courier,
      checkout_data,
    } = await getShippingRates(details);

    if (request_token) {
      await cart.update({ checkoutData: { requestToken: request_token, valid: true } });
    }

    res.status(200).json({
      success: true,
      message: "Proceed to choose a suitable shipping method",
      data: {
        ksecureCommission: parseFloat(KSECURE_FEE),
        info:
          "Please note that the shipping fee is subject to change if the package dimensions are different from the estimated dimensions.",
        couriers: allcouriers,
        checkoutData: checkout_data,
      },
    });
  } else {
    res.status(200).json({
      success: true,
      message: "Cart is empty, please add items to cart to checkout",
      data: {},
    });
  }
});



module.exports = {
  convertcart,
  storeCart,
  getCart,
  updateCart,
  deleteCart,
  cartcheckout
}