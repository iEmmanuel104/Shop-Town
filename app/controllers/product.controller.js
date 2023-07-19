const { Product, User, Store, Category, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingcategories } = require('../services/shipbubble.service');
// const queryString = require('query-string');
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination');
const Op = require('sequelize').Op;
const path = require('path');

const createProduct = asyncWrapper(async (req, res, next) => {
    const { name, description, price, quantity, specifications, shippingcategory, shippingId } = req.body;
    const { storeId, category } = req.query;
    const decoded = req.decoded;

    console.log(name, description, price, quantity, specifications, shippingcategory, storeId, category);
    console.log(req.query);

    if (!name || !price || !quantity || !shippingcategory || !shippingId) {
        return next(new BadRequestError('Please provide all required fields'));
    }

    const filefound = req.files;

    console.log(req.files);

    if (!filefound || !filefound.length) {
        throw new BadRequestError('No files found for upload');
    }

    if (
        quantity.instock >= 0 &&
        quantity.total >= 0 &&
        quantity.instock > quantity.total &&
        quantity.total !== quantity.instock
    ) {
        throw new BadRequestError(
            'Quantity instock cannot be greater than total quantity, both values must be greater than 0 and must be equal',
        );
    }

    const storeExists = await Store.findByPk(storeId);
    if (!storeExists) {
        return next(new NotFoundError('Store not found'));
    }

    const [categoryExists, storeHasAddress, isAssociated] = await Promise.all([
        Category.findByPk(category),
        Store.findByPk(storeId),
        DeliveryAddress.findOne({ where: { storeId, isDefault: true } }),
        storeExists.hasUser(decoded),
    ]);

    if (!categoryExists) {
        return next(new NotFoundError('Category not found'));
    }
    if (!storeHasAddress) {
        return next(new NotFoundError('Store has no delivery address'));
    }
    if (!isAssociated) {
        return next(new ForbiddenError('You are not allowed to access this resource'));
    }

    let fileUrls = [];
    // check if filefound is an empty array

    if (filefound || filefound.length === 0) {
        const details = {
            user: `Stores/${storeExists.name}`,
            folder: 'Products',
        };
        fileUrls = await uploadFiles(req, details);
    }

    const product = await sequelize.transaction(async (t) => {
        return Product.create(
            {
                name,
                description,
                price,
                quantity,
                specifications,
                subcategory: shippingcategory,
                categoryId: category,
                storeId,
                shippingId,
                images: fileUrls,
            },
            { transaction: t },
        );
    });

    return res.status(201).json({
        success: true,
        data: product,
    });
});

const getshippingcategory = asyncWrapper(async (req, res, next) => {
    const categories = await getshippingcategories();
    return res.status(200).json({
        success: true,
        data: categories,
    });
});

const createBulkProducts = asyncWrapper(async (req, res, next) => {
    const products = req.body;
    const errors = [];
    let processed = 0;
    let productNames = [];
    const decoded = req.decoded;
    const { storeId } = req.query;

    const store = await Store.findByPk(storeId);
    if (!store) {
        return next(new NotFoundError('Store not found'));
    }

    const productData = products.map(
        ({ name, description, price, quantity, specifications, category, shippingcategory, shippingId }) => ({
            name,
            description: description || null,
            price,
            quantity,
            specifications: specifications || null,
            subcategory: shippingcategory || null,
            categoryId: category,
            shippingId,
            storeId,
        }),
    );

    try {
        await sequelize.transaction(async (t) => {
            await Product.bulkCreate(productData, { transaction: t });
            processed = products.length;
            productNames = products.map(({ name }) => name);
        });
    } catch (err) {
        console.error(`Failed to create products: ${err.message}`);
        return res.status(207).json({
            success: false,
            message: 'Bulk create completed with errors',
            processed,
            errors: products.map((_, index) => ({
                index,
                message: err.message,
            })),
        });
    }

    return res.status(200).json({
        success: true,
        message: 'All products created successfully',
        processed,
        productNames,
    });
});

const getProducts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { category, subcategory, store, name, price, quantity, priceDiscount, isKsecure, percentageDiscount } =
            req.query;
        const queryfields = req.query.q;
        const filters = {};
        const globalfilters = {};

        if (category) {
            filters.categoryId = category;
        }

        if (subcategory) {
            filters.subcategory = subcategory;
        }

        if (store) {
            filters.storeId = store;
        }

        if (isKsecure) {
            filters.isKsecure = isKsecure;
        }

        if (price) {
            // if price is single value, filter for price less than or equal to price
            //  else if price is an array, filter for price between the two values
            if (Array.isArray(price)) {
                filters.price = { [Op.between]: [parseFloat(price[0]), parseFloat(price[1])] };
            } else filters.price = { [Op.lte]: parseFloat(price) };
        }

        if (quantity) {
            filters.quantity = {
                [Op.and]: [
                    sequelize.literal(`(quantity->>'total')::int >= ${parseInt(quantity)}`),
                    sequelize.literal(`(quantity->>'instock')::int >= ${parseInt(quantity)}`),
                ],
            };
        }

        if (priceDiscount && parseFloat(priceDiscount) >= 200) {
            filters.discount = { [Op.gte]: parseFloat(priceDiscount) };
        }

        if (percentageDiscount && parseFloat(percentageDiscount) >= 0 && parseFloat(percentageDiscount) <= 100) {
            filters.discount = {
                [Op.and]: [{ [Op.gte]: 0 }, { [Op.lte]: 100 }, { [Op.lte]: parseFloat(percentageDiscount) }],
            };
        }

        let whereClause = {};
        if (Object.keys(filters).length > 0 && queryfields) {
            const fieldFilters = Object.entries(filters).map(([key, value]) => ({ [key]: value })); // convert filters object to array of objects
            const queryFilter = { name: { [Op.iLike]: `%${queryfields}%` } }; // filter by name using query field
            whereClause = { [Op.and]: [...fieldFilters, queryFilter] }; // combine the filters and query field
        } else if (Object.keys(filters).length > 0) {
            // if no query field
            whereClause = filters;
        } else if (queryfields) {
            // if no filters
            whereClause = { name: { [Op.iLike]: `%${queryfields}%` } };
        }

        const page = req.query.page ? Number(req.query.page) : 1;
        const size = req.query.size ? Number(req.query.size) : 10;

        if (page < 1 || size < 0) return next(new BadRequestError('Invalid pagination parameters'));

        let limit = null;
        let offset = null;

        if (req.query.page && req.query.size) {
            ({ limit, offset } = getPagination(page, size));
        }

        const products = await Product.scope('includeStore').findAndCountAll(
            {
                where: whereClause,
                include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
                order: [['updatedAt', 'DESC']],
                limit,
                offset,
            },
            { transaction: t },
        );

        const specificCount = products.rows.length;

        if (specificCount === 0) return next(new NotFoundError('No products found'));

        if (specificCount !== products.count) {
            products.count = specificCount;
        }

        const newlimit = limit === null ? products.count : limit;
        const response = getPagingData(products, page, newlimit, 'products');

        if (response.totalPages === null) {
            response.totalPages = 1;
        }

        return res.status(200).json({ success: true, data: response });
    });
});

const getProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        return res.status(200).json({
            success: true,
            data: product,
        });
    });
});

const getStoreProducts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        // const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query;
        if (!storeId) {
            return next(new ForbiddenError('please ensure you are connected to a store'));
        }
        const store = await Store.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError('Store not found'));
        }
        const products = await Product.findAll({
            where: {
                storeId,
            },
        });
        return res.status(200).json({
            success: true,
            message: `Products for store: ${store.name} retrieved successfully`,
            data: products,
        });
    });
});

const toggleProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query;
        const { id } = req.params;

        if (!storeId) {
            return next(new ForbiddenError('please ensure you are connected to a store'));
        }
        const store = await Store.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError('Store not found'));
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        const newproductStatus = product.status === 'active' ? 'inactive' : 'active';
        let messsage;
        if (newproductStatus === 'active') {
            messsage = 'Product has been successfully activated';
        } else {
            messsage = 'Product has been hidden successfully';
        }
        await Product.update(
            {
                status: newproductStatus,
            },
            { where: { id, storeId } },
            { transaction: t },
        );

        return res.status(200).json({
            success: true,
            message: messsage,
        });
    });
});

const updateProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const productId = req.params.id;
        const { name, description, price, quantity, specifications, shippingcategory, shippingId, discount } = req.body;
        const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query;

        if (quantity.instock >= 0 && quantity.total >= 0 && quantity.instock > quantity.total) {
            throw new BadRequestError('Quantity in stock cannot be greater than total quantity');
        }

        // Check if the product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return next(new NotFoundError(`Product with not found`));
        }

        // ensure product is inactive before updating
        if (product.status !== 'inactive') {
            return next(new BadRequestError(`Product must be inactive before updating`));
        }

        // Check if the user is authorized to update the product
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return next(new NotFoundError('User not found'));
        }

        const store = await Store.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError('Store not found'));
        }

        const isAssociated = await store.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }
        let fileUrls = [];

        if (req.files) {
            console.log(req.files);
            const details = {
                user: `Stores/${store.name}`,
                folder: 'Products',
            };
            fileUrls = await uploadFiles(req, details);
        }

        // Update the product
        const updated = await product.update(
            {
                name: name || product.name,
                description: description || product.description,
                price: price || product.price,
                quantity: quantity || product.quantity,
                specifications: specifications || product.specifications,
                subcategory: shippingcategory || product.subcategory,
                shippingId: shippingId || product.shippingId,
                discount: discount || product.discount,
                images: fileUrls || product.images,
            },
            { transaction: t },
        );

        return res.status(200).json({
            success: true,
            message: `Product Updated: ${updated.name} has been successfully updated`,
        });
    });
});

const updateProductdiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { discount } = req.body;
        const { id } = req.params;
        const decoded = req.decoded;
        // const storeId = decoded.storeId
        const { storeId } = req.query;
        const userId = decoded.id;

        // check if user is authorized to create product
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError('User not found'));
        }

        // if (user.role !== 'admin' && user.role !== 'vendor') {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }

        // check if store exists
        const store = await Store.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError('Store not found'));
        }
        const isAssociated = await store.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError('You are not allowed to access this resource'));
        }
        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with ID ${id} not found`));
        }
        const updated = await product.update(
            {
                discount,
            },
            { transaction: t },
        );
        return res.status(200).json({
            success: true,
            message: `Product Updated: ${updated.name} has been successfully updated`,
        });
    });
});

const deleteProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }

        await product.destroy();

        return res.status(200).json({
            success: true,
            message: `${product.name} deleted successfully`,
        });
    });
});

const searchProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
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
                    model: Store,
                    as: 'store',
                },
                {
                    model: Category,
                    as: 'category',
                },
            ],
        });

        return res.status(200).json({
            success: true,
            data: products,
        });
    });
});

module.exports = {
    createProduct,
    createBulkProducts,
    getProducts,
    getProduct,
    getshippingcategory,
    updateProduct,
    deleteProduct,
    searchProduct,
    getStoreProducts,
    toggleProduct,
    updateProductdiscount,
};
