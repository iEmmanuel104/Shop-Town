const { Product, User, Brand, Category } = require('../../models');
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
        const {category} = req.query
        // const { category } = req.params
        const decoded = req.decoded;
        const brandId = decoded.storeId;
        console.log(brandId);
        const userId = decoded.id;
        // check if user is authorized to create product
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }

        let fileUrls = [];

        if (req.files) {
            console.log(req.files)
            const details = {
                folder: 'product',
                user: brandId
            };

            console.log('files found for upload')

            fileUrls = await uploadFiles(req, details);
        }

        // if (user.role !== 'admin' && user.role !== 'vendor') {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }

        // check if brand exists
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return next(new NotFoundError("Store not found"));
        }
        const isAssociated = await brand.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        const product = await Product.create({
            name,
            description,
            price,
            quantity,
            specifications,
            subcategory: shippingcategory,
            categoryId: category,
            brandId: brandId,
            images: fileUrls
        }, { transaction: t });
        res.status(201).json({
            success: true,
            data: product,
        });
    });
});

const getshippingcategory = asyncWrapper(async (req, res, next) => {
    const categories = await getshippingcategories();
    res.status(200).json({
        success: true,
        data: categories
    });
});

const createBulkProducts = asyncWrapper(async (req, res, next) => {
    const products = req.body;
    const errors = [];
    let processed = 0;
    const decoded = req.decoded;
    const brandId = decoded.storeId;
    // check if brand exists
    const brand = await Brand.findByPk(brandId);
    if (!brand) {
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
                    brandId
                }, { transaction: t });
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
    await sequelize.transaction(async (t) => {

        const { category, subcategory, brand } = req.query;

        const filters = {
            ...(category && { categoryId: category }),
            ...(subcategory && { subcategory }),
            ...(brand && { brandId: brand }),
        };

        const page = req.query.page ? Number(req.query.page) : 1;
        const size = req.query.size ? Number(req.query.size) : 10;

        if (page < 1 || size < 0) {
            return next(new BadRequestError('Invalid pagination parameters'));
        }
        const { limit, offset } = getPagination(page, size);

        const products = await Product.scope('includeBrand').findAndCountAll({
            where: filters,
            include: [{   model: Category, as: 'category', attributes: ['id', 'name'] }],
            limit,
            offset
        }, {transaction: t});
        res.status(200).json({ success: true, data: products });
    });

});

const getProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const product = await Product.scope('includeBrand').findByPk(req.params.id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        res.status(200).json({
            success: true,
            data: product,
        });
    })
});

const getStoreProducts = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const brandId = decoded.storeId;
        if (!brandId) {
            return next(new ForbiddenError("please ensure you are connected to a store"));
        }
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return next(new NotFoundError("Store not found"));
        }
        const products = await Product.findAll({
            where: {
                brandId
            }
        });
        res.status(200).json({
            success: true,
            message: `Products for store: ${brand.name} retrieved successfully`,
            data: products,
        });
    })
});

const toggleProduct = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const brandId = decoded.storeId;
        const { id } = req.params

        if (!brandId) {
            return next(new ForbiddenError("please ensure you are connected to a store"));
        }
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return next(new NotFoundError("Store not found"));
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return next(new NotFoundError(`Product with id ${req.params.id} not found`));
        }
        const newproductStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        let messsage; 
        if (newproductStatus === 'ACTIVE') {
            messsage = 'Product has been successfully activated'
        } else {
            messsage = 'Product has been hidden successfully'
        }
        await Product.update({
            status: newproductStatus
        }, { where: { id, brandId }}, { transaction: t });

        res.status(200).json({
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
        const brandId = decoded.storeId;

        // Check if the product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return next(new NotFoundError(`Product with not found`));
        }

        // ensure product is inactive before updating
        if (product.status !== 'INACTIVE') {
            return next(new BadRequestError(`Product must be inactive before updating`));
        }

        // Check if the user is authorized to update the product
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }

        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return next(new NotFoundError("Store not found"));
        }

        const isAssociated = await brand.hasUser(user);
        if (!isAssociated) {
            return next(new ForbiddenError("You are not allowed to access this resource"));
        }
        let fileUrls = [];

        if (req.files) {
            console.log(req.files)
            const details = {
                folder: 'product',
                user: brandId
            };

            console.log('files found for upload')

            fileUrls = await uploadFiles(req, details);
        }

        // Update the product
        const updated = await product.update({
            name: name ? name : product.name,
            description : description ? description : product.description,
            price : price ? price : product.price,
            quantity : quantity ? quantity : product.quantity,
            specifications : specifications ? specifications : product.specifications,
            subcategory : subcategory ? subcategory : product.subcategory,
            discount : discount ? discount : product.discount,  
            images: fileUrls ? fileUrls : product.images
        }, { transaction: t });

        res.status(200).json({
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
        const brandId = decoded.storeId
        const userId = decoded.id

        // check if user is authorized to create product
        const user = await User.findByPk(userId);
        if (!user) {
            return next(new NotFoundError("User not found"));
        }

        // if (user.role !== 'admin' && user.role !== 'vendor') {
        //     return next(new ForbiddenError("You are not allowed to access this resource"));
        // }

        // check if brand exists
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return next(new NotFoundError("Store not found"));
        }
        const isAssociated = await brand.hasUser(user);
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
        res.status(200).json({
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

        res.status(200).json({
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
    })
});


// const searchProduct = asyncWrapper(async (req, res) => {
//     const { searchQuery, rating, review, minPrice, maxPrice, category, brand, sortBy, sortOrder, limit, page } = queryString.parse(req.url.split('?')[1]);

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

//     if (brand && !validator.isInt(brand, { min: 1 })) {
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
//             { '$brand.name$': { [Op.iLike]: `%${searchQuery}%` } },
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

//     if (brand) {
//         filters.brandId = brand;
//     }

//     // Construct the sorting object
//     let order = [['createdAt', 'DESC']];
//     if (sortBy) {
//         order = [[sortBy, sortOrder === 'desc' ? 'DESC' : 'ASC']];
//     }

//     // Perform the search query
//     const { count, rows } = await Product.findAndCountAll({
//         where: filters,
//         include: [{ model: Brand, as: 'brand' }],
//         order,
//         limit: limit ? parseInt(limit) : 10,
//         offset: page ? (parseInt(page) - 1) * (limit ? parseInt(limit) : 10) : 0,
//     });

//     res.status(200).json({ count, rows });
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