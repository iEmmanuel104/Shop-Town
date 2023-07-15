const { Category } = require('../../models');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const Op = require('sequelize').Op;
const { sequelize } = require('../../models');
const path = require('path');
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');

const createCategory = asyncWrapper(async (req, res, next) => {
    if (req.query.bulk === 'true') {
        const { categories } = req.body; // Array of category objects [{ name: 'Category 1', description: 'Description 1' }, { name: 'Category 2', description: 'Description 2' }, ...]
        console.log(categories);

        if (!categories) {
            return next(new BadRequestError('use the key "categories" to send the array of categories'));
        }
        // Map through the array of categories and create them in bulk
        const createdCategories = await Category.bulkCreate(categories);

        return res.status(201).json({
            success: true,
            data: createdCategories,
        });
    } else {
        const { name, description } = req.body;
        if (req.body.categories) {
            return next(new BadRequestError('use the query param "bulk=true" to create multiple categories'));
        }
        if (!name || !description) {
            return next(new BadRequestError('name and description are required'));
        }
        await sequelize.transaction(async (t) => {
            let image = null;
            if (req.file) {
                const image = await uploadSingleFile(req.file, 'categories');
            }

            const category = await Category.create(
                {
                    name,
                    description,
                },
                { transaction: t },
            );
            return res.status(201).json({
                success: true,
                data: category,
            });
        });
    }
});

// const createCategory = asyncWrapper(async (req, res, next) => {
//     const categories = req.body; // Array of category objects [{ name: 'Category 1', description: 'Description 1' }, { name: 'Category 2', description: 'Description 2' }, ...]

//     // Map through the array of categories and create them in bulk
//     const createdCategories = await Category.bulkCreate(categories);

//     return res.status(201).json({
//         success: true,
//         data: createdCategories,
//     });
// });

const getCategories = asyncWrapper(async (req, res, next) => {
    const categories = await Category.findAll();
    return res.status(200).json({
        success: true,
        data: categories,
    });
});

const getCategory = asyncWrapper(async (req, res, next) => {
    let category;
    if (req.query.includeProducts === 'true') {
        category = await Category.scope('includeProducts').findByPk(req.params.id);
    } else {
        category = await Category.findByPk(req.params.id);
    }
    if (!category) {
        return next(new NotFoundError(`Category with id ${req.params.id} not found`));
    }
    return res.status(200).json({
        success: true,
        data: category,
    });
});

const updateCategory = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return next(new NotFoundError(`Category with id ${req.params.id} not found`));
        }
        const { name, description } = req.body;
        category.name = name;
        category.description = description;
        await category.save({ transaction: t });
        return res.status(200).json({
            success: true,
            data: category,
        });
    });
});

const deleteCategory = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return next(new NotFoundError(`Category with id ${req.params.id} not found`));
        }
        await category.destroy({ transaction: t });
        return res.status(200).json({
            success: true,
            data: {},
        });
    });
});

module.exports = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
};
