const { Category } = require('../../models');
require('dotenv').config();
const asyncWrapper = require('../middlewares/async')
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const Op = require("sequelize").Op;
const path = require('path');

const createCategory = asyncWrapper(async (req, res, next) => {
    const { name, description } = req.body;
    const category = await Category.create({
        name,
        description,
    });
    res.status(201).json({
        success: true,
        data: category,
    });
}); 

// const createCategory = asyncWrapper(async (req, res, next) => {
//     const categories = req.body; // Array of category objects [{ name: 'Category 1', description: 'Description 1' }, { name: 'Category 2', description: 'Description 2' }, ...]

//     // Map through the array of categories and create them in bulk
//     const createdCategories = await Category.bulkCreate(categories);

//     res.status(201).json({
//         success: true,
//         data: createdCategories,
//     });
// });


const getCategories = asyncWrapper(async (req, res, next) => {
    const categories = await Category.findAll();
    res.status(200).json({
        success: true,
        data: categories,
    });
});

const getCategory = asyncWrapper(async (req, res, next) => {
    const category = await Category.scope('includeProducts').findByPk(req.params.id);
    if (!category) {
        return next(new NotFoundError(`Category with id ${req.params.id} not found`));
    }
    res.status(200).json({
        success: true,
        data: category,
    });
});

const updateCategory = asyncWrapper(async (req, res, next) => {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
        return next(new NotFoundError(`Category with id ${req.params.id} not found`));
    }
    const { name, description } = req.body;
    category.name = name;
    category.description = description;
    await category.save();
    res.status(200).json({
        success: true,
        data: category,
    });
});

const deleteCategory = asyncWrapper(async (req, res, next) => {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
        return next(new NotFoundError(`Category with id ${req.params.id} not found`));
    }
    await category.destroy();
    res.status(200).json({
        success: true,
        data: {},
    });
});

module.exports = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
};