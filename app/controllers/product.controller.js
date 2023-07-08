const { Product, User, Brand, Category, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { getshippingcategories } = require('../services/shipbubble.service');
// const queryString = require('query-string');
const { uploadSingleFile, uploadFiles } = require('../services/imageupload.service');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const createProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { name, description, price, quantity, specifications, shippingcategory } = req.body;
        if (!name || !price || !quantity || !shippingcategory) return next(new BadRequestError('please provide all required fields'));

        const { storeId, category } = req.query
        const decoded = req.decoded;

        const categoryExists = await Category.findByPk(category)
        if (!categoryExists) return next(new NotFoundError('Category not found'));

        const storeExists = await Brand.findByPk(storeId)
        if (!storeExists) return next(new NotFoundError('Store not found'));

        const storehasAddress = await DeliveryAddress.findOne({ where: { storeId: storeId, isDefault: true } })
        if (!storehasAddress) return next(new NotFoundError('Store has no delivery address'));

        const isAssociated = await storeExists.hasUser(decoded)
        if (!isAssociated) return next(new ForbiddenError("You are not allowed to access this resource"));

        let fileUrls = [];

        if (req.files) {
            console.log(req.files)
            const details = {
                folder: 'product',
                user: storeId
            };

            console.log('files found for upload')

            fileUrls = await uploadFiles(req, details);
        }

        // if (user.role !== 'admin' && user.role !== 'vendor') {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }


        const product = await Product.create({
            name,
            description,
            price,
            quantity,
            specifications,
            subcategory: shippingcategory,
            categoryId: category,
            storeId: storeId,
            images: fileUrls
        }, { transaction: t });

        return res.status(201).json({
            success: true,
            data: product,
        });
    });
});

const getshippingcategory = asyncWrapper(async (req, res, next) => {
    const categories = await getshippingcategories();
    return res.status(200).json({
        success: true,
        data: categories
    });
});

const createBulkProducts = asyncWrapper(async (req, res, next) => {
    const products = req.body;
    const errors = [];
    let processed = 0;
    let productNames = [];
    const decoded = req.decoded;
    // const storeId = decoded.storeId;
    const { storeId } = req.query
    // check if store exists
    const store = await Brand.findByPk(storeId);
    if (!store) {
        return next(new NotFoundError("Store not found"));
    }


    for (let i = 0; i < products.length; i++) {
        const { name, description, price, quantity, specifications, category, subcategory } = products[i];
        try {
            await sequelize.transaction(async (t) => {
                const product = await Product.create({
                    name,
                    description: description ? description : null,
                    price,
                    quantity,
                    specifications: specifications ? specifications : null,
                    subcategory: subcategory ? subcategory : null,
                    categoryId: category,
                    storeId
                }, { transaction: t });
                processed++;
                productNames.push(name);
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
        return res.status(206).json({
            success: false,
            message: "Bulk create completed with errors",
            processed,
            errors,
        });
    } else {
        return res.status(201).json({
            success: true,
            message: "All products created successfully",
            processed,
            productNames,
        });
    }
});

const getProducts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { category, subcategory, store, name, price, quantity, priceDiscount, percentageDiscount } = req.query;
        const queryfields = req.query.q;
        const filters = {};
        const globalfilters = {};

        if (category) { filters.categoryId = category; }

        if (subcategory) { filters.subcategory = subcategory; }

        if (store) { filters.storeId = store; }

        if (price) {
            filters.price = { [Op.lte]: parseFloat(price) };
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
                [Op.and]: [
                    { [Op.gte]: 0 },
                    { [Op.lte]: 100 },
                    { [Op.lte]: parseFloat(percentageDiscount) },
                ],
            };
        }

        let whereClause = {};
        if (Object.keys(filters).length > 0 && queryfields) {
            const fieldFilters = Object.entries(filters).map(([key, value]) => ({ [key]: value })); // convert filters object to array of objects
            const queryFilter = { name: { [Op.iLike]: `%${queryfields}%` } }; // filter by name using query field
            whereClause = { [Op.and]: [...fieldFilters, queryFilter] }; // combine the filters and query field
        } else if (Object.keys(filters).length > 0) {
            whereClause = filters;
        } else if (queryfields) {
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

        const products = await Product.scope('includeBrand').findAndCountAll({
            where: whereClause,
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
            order: [['updatedAt', 'DESC']],
            limit,
            offset,
        }, { transaction: t });

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
        const product = await Product.scope('includeBrand').findByPk(req.params.id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        return res.status(200).json({
            success: true,
            data: product,
        });
    })
});

const getStoreProducts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        // const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query
        if (!storeId) {
            return next(new ForbiddenError("please ensure you are connected to a store"));
        }
        const store = await Brand.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError("Store not found"));
        }
        const products = await Product.findAll({
            where: {
                storeId
            }
        });
        return res.status(200).json({
            success: true,
            message: `Products for store: ${store.name} retrieved successfully`,
            data: products,
        });
    })
});

const toggleProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query
        const { id } = req.params

        if (!storeId) {
            return next(new ForbiddenError("please ensure you are connected to a store"));
        }
        const store = await Brand.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError("Store not found"));
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        const newproductStatus = product.status === 'active' ? 'inactive' : 'active'
        let messsage;
        if (newproductStatus === 'active') {
            messsage = 'Product has been successfully activated'
        } else {
            messsage = 'Product has been hidden successfully'
        }
        await Product.update({
            status: newproductStatus
        }, { where: { id, storeId } }, { transaction: t });

        return res.status(200).json({
            success: true,
            message: messsage,
        });
    })
});


const updateProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {

        const productId = req.params.id;
        const { name, description, price, quantity, specifications, subcategory, discount } = req.body;
        const decoded = req.decoded;
        // const storeId = decoded.storeId;
        const { storeId } = req.query

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
            return next(new NotFoundError("User not found"));
        }

        const store = await Brand.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError("Store not found"));
        }

        const isAssociated = await store.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        let fileUrls = [];

        if (req.files) {
            console.log(req.files)
            const details = {
                folder: 'product',
                user: storeId
            };

            console.log('files found for upload')

            fileUrls = await uploadFiles(req, details);
        }

        // Update the product
        const updated = await product.update({
            name: name ? name : product.name,
            description: description ? description : product.description,
            price: price ? price : product.price,
            quantity: quantity ? quantity : product.quantity,
            specifications: specifications ? specifications : product.specifications,
            subcategory: subcategory ? subcategory : product.subcategory,
            discount: discount ? discount : product.discount,
            images: fileUrls ? fileUrls : product.images
        }, { transaction: t });

        return res.status(200).json({
            success: true,
            message: `Product Updated: ${updated.name} has been successfully updated`,
        });
    })
});

const updateProductdiscount = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const { discount } = req.body
        const { id } = req.params
        const decoded = req.decoded
        // const storeId = decoded.storeId
        const { storeId } = req.query
        const userId = decoded.id

        // check if user is authorized to create product
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }

        // if (user.role !== 'admin' && user.role !== 'vendor') {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }

        // check if store exists
        const store = await Brand.findByPk(storeId);
        if (!store) {
            return next(new NotFoundError("Store not found"));
        }
        const isAssociated = await store.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with ID ${id} not found`));
        }
        const updated = await product.update({
            discount
        }, { transaction: t });
        return res.status(200).json({
            success: true,
            message: `Product Updated: ${updated.name} has been successfully updated`,
        });
    })
})

const deleteProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {

        const { id } = req.params
        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }

        await product.destroy();

        return res.status(200).json({
            success: true,
            message: `${product.name} deleted successfully`
        });
    })
})

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
                    model: Brand,
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
    })
});


// const searchProduct = asyncWrapper(async (req, res) => {
//     const { searchQuery, rating, review, minPrice, maxPrice, category, store, sortBy, sortOrder, limit, page } = queryString.parse(req.url.split('?')[1]);

//     // Validation for query parameters
//     if (!searchQuery) {
//         throw new BadRequestError('Please provide a search query');
//     }

//     if (rating && !validator.isInt(rating, { min: 1, max: 5 })) {
//         throw new BadRequestError('Rating should be an integer between 1 and 5');
//     }

//     if (review && !validator.isInt(review, { min: 1 })) {
//         throw new BadRequestError('Review should be an integer greater than 0');
//     }

//     if (minPrice && !validator.isFloat(minPrice, { min: 0 })) {
//         throw new BadRequestError('Minimum price should be a non-negative number');
//     }

//     if (maxPrice && !validator.isFloat(maxPrice, { min: 0 })) {
//         throw new BadRequestError('Maximum price should be a non-negative number');
//     }

//     if (category && !validator.isInt(category, { min: 1 })) {
//         throw new BadRequestError('Category ID should be a positive integer');
//     }

//     if (store && !validator.isInt(store, { min: 1 })) {
//         throw new BadRequestError('Brand ID should be a positive integer');
//     }

//     if (sortBy && !['name', 'price', 'rating', 'review'].includes(sortBy)) {
//         throw new BadRequestError('Invalid sort parameter. Valid options are "name", "price", "rating", and "review".');
//     }

//     if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
//         throw new BadRequestError('Invalid sort order. Valid options are "asc" and "desc".');
//     }

//     if (limit && (!validator.isInt(limit, { min: 1, max: 100 }) || parseInt(limit) < 1)) {
//         throw new BadRequestError('Limit should be an integer between 1 and 100');
//     }

//     if (page && (!validator.isInt(page, { min: 1 }) || parseInt(page) < 1)) {
//         throw new BadRequestError('Page should be a positive integer');
//     }

//     // Construct the filter object
//     const filters = {
//         [Op.or]: [
//             { name: { [Op.iLike]: `%${searchQuery}%` } },
//             { description: { [Op.iLike]: `%${searchQuery}%` } },
//             { '$store.name$': { [Op.iLike]: `%${searchQuery}%` } },
//         ],
//     };

//     if (rating) {
//         filters.rating = {
//             [Op.gte]: rating,
//         };
//     }

//     if (review) {
//         filters.review = {
//             [Op.gte]: review,
//         };
//     }

//     if (minPrice && maxPrice) {
//         filters.price = {
//             [Op.between]: [minPrice, maxPrice],
//         };
//     } else if (minPrice) {
//         filters.price = {
//             [Op.gte]: minPrice,
//         };
//     } else if (maxPrice) {
//         filters.price = {
//             [Op.lte]: maxPrice,
//         }
//     }

//     if (category) {
//         filters.categoryId = category;
//     }

//     if (store) {
//         filters.storeId = store;
//     }

//     // Construct the sorting object
//     let order = [['createdAt', 'DESC']];
//     if (sortBy) {
//         order = [[sortBy, sortOrder === 'desc' ? 'DESC' : 'ASC']];
//     }

//     // Perform the search query
//     const { count, rows } = await Product.findAndCountAll({
//         where: filters,
//         include: [{ model: Brand, as: 'store' }],
//         order,
//         limit: limit ? parseInt(limit) : 10,
//         offset: page ? (parseInt(page) - 1) * (limit ? parseInt(limit) : 10) : 0,
//     });

//     return res.status(200).json({ count, rows });
// });


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
    updateProductdiscount
};