const { Category, Brand } = require('../../models');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async')

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
    const brands = await Brand.findAll();
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

module.exports = {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
};

