const { Category, Brand, User, Product, StoreDiscount, DeliveryAddress } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const { validateAddress } = require('../services/shipbubble.service');
const asyncWrapper = require('../middlewares/async');
const Op = require("sequelize").Op;
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
const { at } = require('lodash');

const createBrand = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { name, socials } = req.body;
        const store = await Brand.create({
            name,
            socials,
            userId
        }, { transaction: t });
        res.status(201).json({
            success: true,
            data: store,
        });
    });
});

const getBrands = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const stores = await Brand.findAll({
            attributes: ['id', 'name', 'socials', 'businessPhone', 'owner', 'logo', 'owner'],
        });
        res.status(200).json({
            success: true,
            data: stores,
        });
    });
});

const getBrand = asyncWrapper(async (req, res, next) => {
    const store = await Brand.findByPk(req.params.id);
    if (!store) {
        return next(new NotFoundError(`store not found`));
    }
    res.status(200).json({
        success: true,
        data: store,
    });
});

const getBrandStaff = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }
        const store = await Brand.scope('includeUsers').findByPk(req.params.id,
            { attributes: ['name', 'businessPhone', 'socials', 'owner'] }
        );
        if (!store) {
            return next(new NotFoundError(`Brand not found`));
        }
        if (store.owner !== userId) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        res.status(200).json({
            success: true,
            data: store,
        });
    });
});

const updateBrand = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {

        const decoded = req.decoded;
        const userId = decoded.id;
        const store = await Brand.findByPk(req.params.id);
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }
        if (!store) {
            return next(new NotFoundError(`store not found`));
        }
        const Daddress = await DeliveryAddress.findOne({ where: { storeId: store.id, isDefault: true } });
        // if (store.owner !== userId) {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }
        const { storeName, socials, businessPhone, industry, address, country, state, city, postal } = req.body;
        store.name = storeName ? storeName : store.name;
        store.socials = socials ? socials : store.socials;
        store.businessPhone = businessPhone ? businessPhone : store.businessPhone;
        store.industry = industry ? industry : store.industry;
        await store.save();
        const addressdetails = address + ',' + city + ',' + state + ',' + country

        let url;
        if (req.file) {
            const details = {
                user: user.id,
                folder: `Stores/${storeName}/banner`,
            }
            url = await uploadSingleFile(req.file, details)
        }

        const detailss = {
            name: store.name,
            email: user.email,
            phone: store.businessPhone,
            address: addressdetails,
        }

        const address_code = await validateAddress(detailss)

        Daddress.address = address;
        Daddress.city = city;
        Daddress.state = state;
        Daddress.country = country;
        Daddress.postal = postal;
        Daddress.addressCode = address_code;
        Daddress.logo = url ? url : Daddress.logo;

        await Daddress.save({ transaction: t });

        res.status(200).json({
            success: true,
            data: store,
        });
    });
});

const deleteBrand = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const store = await Brand.findByPk(req.params.id);
        if (!store) {
            return next(new NotFoundError(`Brand not found`));
        }
        await store.destroy({ transaction: t });
        res.status(200).json({
            success: true,
            data: {},
        });
    });
});

const AddStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
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

        const store = await Brand.findByPk(req.params.id,
            { attributes: ['owner'] },
            include
        );


        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        const newStoreDiscount = await StoreDiscount.create({
            title,
            type: type ? type : 'percentage',
            value,
            endDate,
            categoryIds: categories,
            storeId: req.params.id
        }, { transaction: t });
        res.status(201).json({
            success: true,
            data: newStoreDiscount,
        });
    });
});

const getStoreDiscounts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }
        const store = await Brand.findByPk(req.params.id);
        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        const storeDiscounts = await StoreDiscount.findAll({
            where: { storeId: req.params.id },
            attributes: ['id', 'title', 'type', 'value', 'endDate']
        });
        res.status(200).json({
            success: true,
            data: storeDiscounts,
        });
    });
});

const updateStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { title, type, value, endDate, status } = req.body;
        const store = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }

        const storeDiscount = await StoreDiscount.findByPk(req.query.discountId);
        if (!storeDiscount) {
            return next(new NotFoundError(`Store Discount not found`));
        }
        storeDiscount.title = title ? title : storeDiscount.title;
        storeDiscount.type = type ? type : storeDiscount.type;
        storeDiscount.value = value ? value : storeDiscount.value;
        storeDiscount.endDate = endDate ? endDate : storeDiscount.endDate;
        storeDiscount.status = status ? status : storeDiscount.status;
        await storeDiscount.save({ transaction: t });
        // update the product table 
        res.status(200).json({
            success: true,
            data: storeDiscount,
        });
    });
});

const deleteStoreDiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const store = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }

        const storeDiscount = await StoreDiscount.findByPk(req.query.discountId);
        if (!storeDiscount) {
            return next(new NotFoundError(`Store Discount not found`));
        }
        await storeDiscount.destroy({ transaction: t });
        res.status(200).json({
            success: true,
            message: "Store Discount deleted successfully",
            data: {},
        });
    });
});

// endpoint to increase store product price by amount or percentage
const increaseStoreProductPrice = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const { amount, percentage } = req.body;
        const { category } = req.query;

        const store = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

        if (!store) {
            return next(new NotFoundError(`Store not found`));
        }

        if (store.owner !== userId) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }

        // Define the filter based on the category
        const filter = {
            storeId: req.params.id,
        };
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

        res.status(200).json({
            success: true,
            message: `Product prices increased successfully by ${amount ? amount : percentage + '%'}}`,
        });
    });
});



module.exports = {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
    getBrandStaff,
    AddStoreDiscount,
    getStoreDiscounts,
    updateStoreDiscount,
    deleteStoreDiscount,
    increaseStoreProductPrice
};

