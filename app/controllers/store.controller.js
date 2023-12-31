const { Category, Store, User, Product, StoreDiscount, DeliveryAddress, AccountDetails } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const { validateAddress } = require('../services/shipbubble.service');
const asyncWrapper = require('../middlewares/async');
const Op = require('sequelize').Op;
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
const { at } = require('lodash');
const { generateWallet } = require('../services/wallet.service');

//  quick create a store
const createStore = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { name, socials } = req.body;
        const store = await Store.create(
            {
                name,
                socials,
                userId,
            },
            { transaction: t },
        );

        return res.status(201).json({
            success: true,
            data: store,
        });
    });
});

const addStoreAccount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { accountName, accountNumber, bankName, bankCode } = req.body;
        const store = await Store.findByPk(req.params.id);

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        // Check if the store already has any existing account details
        const existingAccount = await AccountDetails.findOne({
            where: { storeId: store.id },
        });

        if (!existingAccount) {
            // Generate wallet only if no existing account details found
            await generateWallet({ id: store.id, type: 'store' });
        }

        const account = await AccountDetails.create(
            {
                accountName,
                accountNumber,
                bankName,
                bankCode,
                storeId: store.id,
            },
            { transaction: t },
        );

        return res.status(201).json({
            success: true,
            data: account,
        });
    });
});

const getStores = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const stores = await Store.findAll({
            attributes: ['id', 'name', 'socials', 'businessPhone', 'owner', 'logo', 'owner'],
            // include delivery address
            include: [
                {
                    model: DeliveryAddress,
                    as: 'deliveryAddress',
                    where: { isDefault: true },
                    attributes: ['address', 'city', 'state', 'country', 'isDefault'],
                },
            ],
        });
        return res.status(200).json({
            success: true,
            data: stores,
        });
    });
});

const getStore = asyncWrapper(async (req, res, next) => {
    const store = await Store.findByPk(req.params.id, {
        attributes: ['id', 'name', 'socials', 'businessPhone', 'owner', 'logo', 'owner'],
        // include delivery address
        include: [
            {
                model: DeliveryAddress,
                as: 'deliveryAddress',
                where: { isDefault: true },
                attributes: ['address', 'city', 'state', 'country', 'isDefault'],
            },
        ],
    });
    if (!store) {
        return next(new NotFoundError(`store not found`));
    }
    return res.status(200).json({
        success: true,
        data: store,
    });
});

const getStoreStaff = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;

        const store = await Store.scope('includeUsers').findByPk(req.params.id, {
            attributes: ['name', 'businessPhone', 'socials', 'owner'],
        });

        if (!store) {
            return next(new NotFoundError(`Store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }

        return res.status(200).json({
            success: true,
            data: store,
        });
    });
});

const updateStore = asyncWrapper(async (req, res, next) => {
    const payload = req.decoded;
    const userId = payload.id;
    const storeId = req.params.id;
    const { storeName, socials, phone, industry, settings } = req.body;

    if (!storeId) {
        return next(new BadRequestError('No store id provided'));
    }

    const storeExists = await Store.findByPk(storeId);
    if (!storeExists) {
        return next(new NotFoundError('Store not found'));
    }

    if (!storeName && !socials && !phone && !industry && !settings && !req.file) {
        return next(new BadRequestError('No update data provided'));
    }

    const storeUpdate = {};
    // if (storeName) storeUpdate.name = storeName;
    if (socials) storeUpdate.socials = socials;
    if (phone) storeUpdate.businessPhone = phone;
    if (industry) storeUpdate.industry = industry;
    if (settings) storeUpdate.storeSettings = settings;

    let url;
    if (req.file) {
        const details = {
            user: storeName ? `Stores/${storeName.trim().toLowerCase()}` : `Stores/${storeExists.name}`,
            folder: `Images`,
        };
        url = await uploadSingleFile(req.file, details);
        storeUpdate.logo = url;
    }

    const [updatedCount] = await Store.update(storeUpdate, {
        where: { id: storeId, owner: userId },
    });

    if (updatedCount === 0) {
        return next(new NotFoundError('Store not found or access denied'));
    }

    const updatedStore = await Store.findByPk(storeId);

    return res.status(200).json({
        success: true,
        data: updatedStore,
    });
});

const deleteStore = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const store = await Store.findByPk(req.params.id);
        if (!store) {
            return next(new NotFoundError(`Store not found`));
        }
        await store.destroy({ transaction: t });
        return res.status(200).json({
            success: true,
            data: {},
        });
    });
});

const AddStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { title, type, value, endDate } = req.body;
        // split categories from string to array
        let categories = [];
        if (req.query.categories && typeof req.query.categories === 'string') {
            categories = req.query.categories.split(',');
        }

        let include = [];

        if (categories.length > 0) {
            include = [{ model: Product, attributes: ['id'], where: { category: { [Op.in]: categories } } }];
        }

        const store = await Store.findByPk(req.params.id, { attributes: ['owner'] }, include);

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }
        const newStoreDiscount = await StoreDiscount.create(
            {
                title,
                type: type || 'percentage',
                value,
                endDate,
                categoryIds: categories,
                storeId: req.params.id,
            },
            { transaction: t },
        );

        return res.status(201).json({
            success: true,
            data: newStoreDiscount,
        });
    });
});

const getStoreDiscounts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;

        const store = await Store.findByPk(req.params.id);
        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        const storeDiscounts = await StoreDiscount.findAll({
            where: { storeId: req.params.id },
            attributes: ['id', 'title', 'type', 'value', 'endDate'],
        });
        return res.status(200).json({
            success: true,
            data: storeDiscounts,
        });
    });
});

const updateStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { title, type, value, endDate, status, discountId } = req.body;
        const store = await Store.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }

        const storeDiscount = await StoreDiscount.findByPk(discountId);
        if (!storeDiscount) {
            return next(new NotFoundError(`Store Discount not found`));
        }

        storeDiscount.title = title || storeDiscount.title;
        storeDiscount.type = type || storeDiscount.type;
        storeDiscount.value = value || storeDiscount.value;
        storeDiscount.endDate = endDate || storeDiscount.endDate;
        storeDiscount.status = status || storeDiscount.status;

        await storeDiscount.save({ transaction: t });

        // update the product table
        return res.status(200).json({
            success: true,
            data: storeDiscount,
        });
    });
});

const deleteStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const store = await Store.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }

        const storeDiscount = await StoreDiscount.findByPk(req.query.discountId);
        if (!storeDiscount) {
            return next(new NotFoundError(`Store Discount not found`));
        }

        await storeDiscount.destroy({ transaction: t });

        return res.status(200).json({
            success: true,
            message: 'Store Discount deleted successfully',
            data: {},
        });
    });
});

// endpoint to increase store product price by amount or percentage
const increaseStoreProductPrice = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const payload = req.decoded;
        const userId = payload.id;
        const { amount, percentage } = req.body;
        const { category } = req.query;

        const store = await Store.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`Store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }

        // Define the filter based on the category
        const filter = { storeId: req.params.id };

        if (category) {
            filter.categoryId = category;
        }

        // Retrieve the store products based on the filter
        const products = await Product.findAll({ where: filter });

        // Increment the price of each product based on the given amount or percentage
        for (const product of products) {
            if (amount) {
                product.price = parseFloat(product.price) + parseFloat(amount);
            } else if (percentage) {
                product.price += (product.price * percentage) / 100;
            }
            await product.save();
        }

        return res.status(200).json({
            success: true,
            message: `Product prices increased successfully by ${amount || percentage + '%'}}`,
        });
    });
});

const storeAnalytics = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {});
});

module.exports = {
    createStore,
    getStores,
    getStore,
    addStoreAccount,
    updateStore,
    deleteStore,
    getStoreStaff,
    AddStoreDiscount,
    getStoreDiscounts,
    updateStoreDiscount,
    deleteStoreDiscount,
    increaseStoreProductPrice,
};
