const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async')
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const AddNewAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { address, city, state, country, postal, phone, type, defaults } = req.body;
        const deliveryAddress = await DeliveryAddress.create({
            address: address,
            city,
            state,
            country,
            phone,
            type: type ? type : 'home',
            isDefault: defaults ? defaults : false,
            postal: postal ? postal : null,
            userId
        });
        res.status(200).json({
            success: true,
            data: deliveryAddress
        });
    });
});

const GetDeliveryAddresses = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const deliveryAddresses = await DeliveryAddress.findAll({
            where: {
                userId: userId
            }
        });
        res.status(200).json({
            success: true,
            data: deliveryAddresses
        });
    });
});

const GetDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { id } = req.params;
        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id: id,
                userId: userId
            }
        });
        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found with id of ${id}`);
        }
        res.status(200).json({
            success: true,
            data: deliveryAddress
        });
    });
});

const UpdateDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { id } = req.params;
        const { address, city, state, country, postal, phone, type, defaults } = req.body;
        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id: id,
                userId: userId
            }
        });
        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found with id of ${id}`);
        }
        deliveryAddress.address = address ? address : deliveryAddress.address;
        deliveryAddress.city = city ? city : deliveryAddress.city;
        deliveryAddress.state = state ? state : deliveryAddress.state;
        deliveryAddress.country = country ? country : deliveryAddress.country;
        deliveryAddress.postal = postal ? postal : deliveryAddress.postal;
        deliveryAddress.phone = phone ? phone : deliveryAddress.phone;
        deliveryAddress.type = type ? type : deliveryAddress.type;
        deliveryAddress.isDefault = defaults ? defaults : deliveryAddress.isDefault;
        await deliveryAddress.save();
        res.status(200).json({
            success: true,
            message: 'Delivery Address updated successfully',
            data: deliveryAddress
        });
    });
});

const DeleteDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { id } = req.params;
        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id: id,
                userId: userId
            }
        });
        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found with id of ${id}`);
        }
        await deliveryAddress.destroy();
        res.status(200).json({
            success: true,
            message: 'Delivery Address deleted successfully'
        });
    });
});

module.exports = {
    AddNewAddress,
    GetDeliveryAddresses,
    GetDeliveryAddress, 
    UpdateDeliveryAddress,
    DeleteDeliveryAddress,
    // SetDefaultDeliveryAddress
}