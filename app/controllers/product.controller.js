const { Product } = require('../../models');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async')
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const Op = require("sequelize").Op;
const path = require('path');

const createProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { name, description, price, quantity, category, brand } = req.body;
        const product = await Product.create({
            name,
            description,
            price,
            quantity,
            categoryId: category,
            brandId: brand,
        });
        res.status(201).json({
            success: true,
            data: product,
        });
    });
});

const createBulkProducts = asyncWrapper(async (req, res, next) => {
    const products = req.body;
    const errors = [];
    let processed = 0;

    for (let i = 0; i < products.length; i++) {
        const { name, description, price, quantity, category, brand } = products[i];
        try {
            await sequelize.transaction(async (t) => {
                const product = await Product.create({
                    name,
                    description,
                    price,
                    quantity,
                    categoryId: category,
                    brandId: brand,
                });
                processed++;
            });
        } catch (err) {
            console.error(`Failed to create product: ${err.message}`);
            errors.push({
                index: i,
                message: err.message,
            });
        }
    }

    if (errors.length > 0) {
        res.status(206).json({
            success: false,
            message: "Bulk create completed with errors",
            processed,
            errors,
        });
    } else {
        res.status(201).json({
            success: true,
            message: "All products created successfully",
            processed,
        });
    }
});

const getProducts = asyncWrapper(async (req, res, next) => {
    const products = await Product.findAll();
    res.status(200).json({
        success: true,
        data: products,
    });
});

const getProduct = asyncWrapper(async (req, res, next) => {
    const product = await Product.scope('includeCategory', 'includeBrand').findByPk(req.params.id);
    if (!product) {
        return next(new NotFoundError(`Product with id ${req.params.id} not found`));
    }
    res.status(200).json({
        success: true,
        data: product,
    });
});

const updateProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const {id} = req.params
        const product = await Product.findByPk(id); 

        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }

        const { name, description, price, quantity, category, brand } = req.body;

        await product.update({
            name,
            description,
            price,
            quantity,
            categoryId: category,
            brandId: brand,
        });

        res.status(200).json({
            success: true,
            data: product,
        });
    });
});

const deleteProduct = asyncWrapper(async (req, res, next) => {
    const { id } = req.params
    const product = await Product.findByPk(id);
    if (!product) {
        return next(new NotFoundError(`Product with id ${req.params.id} not found`));
    }

    await product.destroy();

    res.status(200).json({
        success: true,
        data: product,
    });
})

const searchProuct = asyncWrapper(async (req, res, next) => {
    const { search, rating, review, minPrice, maxPrice } = req.query;
    const filters = {};

    if (search) {
        filters.name = {
            [Op.iLike]: `%${search}%`,
        };
    }

    if (rating) {
        filters.rating = {
            [Op.gte]: rating,
        };
    }

    if (review) {
        filters.review = {
            [Op.gte]: review,
        };
    }

    if (minPrice && maxPrice) {
        filters.price = {
            [Op.between]: [minPrice, maxPrice],
        };
    } else if (minPrice) {
        filters.price = {
            [Op.gte]: minPrice,
        };
    } else if (maxPrice) {
        filters.price = {
            [Op.lte]: maxPrice,
        };
    }

    const products = await Product.findAll({
        where: filters,
        include: [
            {
                model: Brand,
                as: 'brand',
            },
            {
                model: Category,
                as: 'category',
            },
        ],
    });

    res.status(200).json({
        success: true,
        data: products,
    });
});
module.exports = {
    createProduct,
    createBulkProducts,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    searchProuct
};