const { Category, Brand, User, StoreDiscount } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async');
const { at } = require('lodash');

const createBrand = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { name, socials } = req.body;
    const brand = await Brand.create({
        name,
        socials,
        userId
    });
    res.status(201).json({
        success: true,
        data: brand,
    });
});

const getBrands = asyncWrapper(async (req, res, next) => {
    const brands = await Brand.findAll({
        attributes: ['id', 'name', 'socials', 'businessPhone', 'owner', 'logo', 'owner'],
    });
    res.status(200).json({
        success: true,
        data: brands,
    });
});

const getBrand = asyncWrapper(async (req, res, next) => {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }
    res.status(200).json({
        success: true,
        data: brand,
    });
});

const getBrandStaff = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const user = await User.findByPk(userId);
    if (!user) {
        return next(new NotFoundError("User not found"));
    } 
    const brand = await Brand.scope('includeUsers').findByPk(req.params.id,
        { attributes : [ 'name', 'businessPhone', 'socials', 'owner'] }
        );
    if (!brand) { 
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }
    if (brand.owner !== userId) {
        return next(new ForbiddenError("You are not allowed to access this resource"));
    }
    res.status(200).json({
        success: true,
        data: brand,
    });
});

const updateBrand = asyncWrapper(async (req, res, next) => {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }
    const { name, socials } = req.body;
    brand.name = name;
    brand.socials = socials;
    await brand.save();
    res.status(200).json({
        success: true,
        data: brand,
    });
});

const deleteBrand = asyncWrapper(async (req, res, next) => {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }
    await brand.destroy();
    res.status(200).json({
        success: true,
        data: {},
    });
});

const AddStoreDiscount = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { title, type, value, endDate } = req.body;
    const brand = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }

    if (brand.owner !== userId) {
        return next(new ForbiddenError("You are not allowed to access this resource"));
    }
    const newStoreDiscount = await StoreDiscount.create({
        title,
        type,
        value,
        endDate,
        brandId: req.params.id
    });
    res.status(201).json({
        success: true,
        data: newStoreDiscount,
    });
});

const getStoreDiscounts = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const user = await User.findByPk(userId);
    if (!user) {
        return next(new NotFoundError("User not found"));
    }
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }

    const storeDiscounts = await StoreDiscount.findAll({
        where: { brandId: req.params.id },
        attributes: ['id', 'title', 'type', 'value', 'endDate']
    });
    res.status(200).json({
        success: true,
        data: storeDiscounts,
    });
});

const updateStoreDiscount = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { title, type, value, endDate, status } = req.body;
    const brand = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }

    if (brand.owner !== userId) {
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
    await storeDiscount.save();
    // update the product table 
    res.status(200).json({
        success: true,
        data: storeDiscount,
    });
});

const deleteStoreDiscount = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const brand = await Brand.findByPk(req.params.id, { attributes: ['owner'] });

    if (!brand) {
        return next(new NotFoundError(`Brand with id ${req.params.id} not found`));
    }

    if (brand.owner !== userId) {
        return next(new ForbiddenError("You are not allowed to access this resource"));
    }

    const storeDiscount = await StoreDiscount.findByPk(req.query.discountId);
    if (!storeDiscount) {
        return next(new NotFoundError(`Store Discount not found`));
    }
    await storeDiscount.destroy();
    res.status(200).json({
        success: true,
        message: "Store Discount deleted successfully",
        data: {},
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
    deleteStoreDiscount
};

