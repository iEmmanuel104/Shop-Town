const { Product, User, Store, Category, Cart, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination');
const Op = require('sequelize').Op;
const path = require('path');
const { validateAddress } = require('../services/shipbubble.service');

const AddNewAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const user = await User.findOne({ where: { id: userId } });
        const { address, city, state, country, postal, phone, type, defaults } = req.body;
        const addressdetails = address + ',' + city + ',' + state + ',' + country;
        const name = user.fullName;

        const detailss = {
            name,
            email: user.email,
            phone,
            address: addressdetails,
        };

        const addressCode = await validateAddress(detailss);

        const deliveryAddress = await DeliveryAddress.create({
            address,
            city,
            state,
            country,
            phone,
            type: type || 'home',
            isDefault: defaults || false,
            postal: postal || null,
            addressCode,
            userId,
        });

        return res.status(200).json({
            success: true,
            data: deliveryAddress,
        });
    });
});

const GetDeliveryAddresses = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;

        const deliveryAddresses = await DeliveryAddress.findAll({
            where: { userId },
        });

        return res.status(200).json({
            success: true,
            data: deliveryAddresses,
        });
    });
});

const GetDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { id } = req.params;

        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found with id of ${id}`);
        }

        return res.status(200).json({
            success: true,
            data: deliveryAddress,
        });
    });
});

const UpdateDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { id } = req.params;
        const { address, city, state, country, postal, phone, type, defaults } = req.body;
        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found`);
        }

        deliveryAddress.address = address || deliveryAddress.address;
        deliveryAddress.city = city || deliveryAddress.city;
        deliveryAddress.state = state || deliveryAddress.state;
        deliveryAddress.country = country || deliveryAddress.country;
        deliveryAddress.postal = postal || deliveryAddress.postal;
        deliveryAddress.phone = phone || deliveryAddress.phone;
        deliveryAddress.type = type || deliveryAddress.type;
        deliveryAddress.isDefault = defaults || deliveryAddress.isDefault;
        await deliveryAddress.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery Address updated successfully',
            data: deliveryAddress,
        });
    });
});

const DeleteDeliveryAddress = asyncWrapper(async (req, res) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { id } = req.params;

        const deliveryAddress = await DeliveryAddress.findOne({
            where: {
                id,
                userId,
            },
        });

        if (!deliveryAddress) {
            throw new NotFoundError(`Delivery Address not found with id of ${id}`);
        }

        await deliveryAddress.destroy();

        return res.status(200).json({
            success: true,
            message: 'Delivery Address deleted successfully',
        });
    });
});

const RevalidateDeliveryAddress = asyncWrapper(async (req, res) => {
    const deliveryAddresses = await DeliveryAddress.findAll();

    const errors = []; // Array to store encountered errors
    let revalidatedCount = 0; // Counter for revalidated addresses
    let errorCount = 0; // Counter for addresses that faced errors
    let userAddressCount = 0; // Counter for addresses associated with users
    let storeAddressCount = 0; // Counter for addresses associated with stores

    for (let i = 0; i < deliveryAddresses.length; i++) {
        const deliveryAddress = deliveryAddresses[i];
        let details;

        // Find the referenced table (User or Store)
        if (deliveryAddress.userId) {
            // User reference
            const user = await User.findOne({ where: { id: deliveryAddress.userId } });
            details = {
                name: user.fullName,
                email: user.email,
                phone: deliveryAddress.phone,
                address: `${deliveryAddress.address}, ${deliveryAddress.city}, ${deliveryAddress.state}, ${deliveryAddress.country}`,
            };
            userAddressCount++; // Increment user address count
        } else if (deliveryAddress.storeId) {
            // Store reference
            const store = await Store.findOne({ where: { id: deliveryAddress.storeId } });
            const storeName = store.name;
            const checkstoreName = storeName.trim().toLowerCase() + ' ' + 'Klick';
            details = {
                name: checkstoreName,
                email: store.businessEmail,
                phone: store.businessPhone,
                address: `${deliveryAddress.address}, ${deliveryAddress.city}, ${deliveryAddress.state}, ${deliveryAddress.country}`,
            };
            storeAddressCount++; // Increment store address count
        } else {
            continue; // Skip if no valid reference found
        }

        try {
            const addressCode = await validateAddress(details);

            // Update the addressCode column in the deliveryAddress table
            await deliveryAddress.update({ addressCode });

            revalidatedCount++; // Increment revalidated address count
        } catch (error) {
            // Handle errors by adding them to the errors array
            errors.push({ addressId: deliveryAddress.id, error: error.message });
            errorCount++; // Increment error count
        }
    }

    return res.status(200).json({
        success: true,
        message: 'Delivery addresses revalidated successfully.',
        analytics: {
            revalidatedCount,
            errorCount,
            userAddressCount,
            storeAddressCount,
        },
        errors,
    });
});

module.exports = {
    AddNewAddress,
    GetDeliveryAddresses,
    GetDeliveryAddress,
    UpdateDeliveryAddress,
    DeleteDeliveryAddress,
    RevalidateDeliveryAddress,
    // SetDefaultDeliveryAddress
};
