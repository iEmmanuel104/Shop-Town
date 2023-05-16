const { Product, User, Brand, Category, Cart } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async')
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const storeCart = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const { items } = req.body;
            const newCart = await Cart.create({
                userId: null,
                items: items
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
        const {id } = req.params;
        const { items } = req.body;
        const cart = await Cart.findOne({
            where: {
                id: id
            }
        });
        if (cart) {
            cart.items = items;
            await cart.save();
            res.status(200).json({
                success: true,
                data: cart
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
        const cart = await Cart.findOne({
            where: {
                id: id
            }
        });
        if (cart) {
            cart.userId = decoded.id;
            await cart.save();
            res.status(200).json({
                success: true,
                message: "Proceed to choose a suitable shipping method",
                data: cart
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
    storeCart,
    getCart,
    updateCart,
    deleteCart,
    cartcheckout
}
