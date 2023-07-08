module.exports = (sequelize, DataTypes) => {
    const { Brand } = require('./entityModel')(sequelize, DataTypes);

    const Product = sequelize.define("Product", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: { type: DataTypes.TEXT },
        subcategory: { type: DataTypes.STRING },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        quantity: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {
                total: 0,
                instock: 0
            }
        },
        discount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            validate: {
                min: 0,
                max: 100
            }
        },
        discountedPrice: {
            type: DataTypes.VIRTUAL,
            get() {
                const price = parseFloat(this.getDataValue('price')),
                    discount = parseFloat(this.getDataValue('discount')),
                    discountedPrice = price * (1 - discount / 100),
                    roundedPrice = Math.round(discountedPrice);
                return roundedPrice;
            }
        },
        specifications: { type: DataTypes.JSONB },
        status: {
            type: DataTypes.ENUM(["active", "inactive"]),
            defaultValue: "active",
            allowNull: false
        },
        images: {
            type: DataTypes.ARRAY(DataTypes.STRING)},
    }, {
        tableName: 'Product',
        timestamps: true,
        scopes: {
            Brand(storeId) {
                return {
                    where: { storeId }
                }
            },
            includeBrand: {
                where: { status: 'active' },
                include: [
                    {
                        model: Brand,
                        as: 'store',
                        attributes: ['id', 'name', 'businessPhone', 'socials', 'logo'],
                    }
                ]
            },
            includeOrders: {
                include: [{
                    model: 'Order',
                    as: 'orders'
                }]
            },
            includeReviews: {
                include: [{
                    model: 'Review',
                    as: 'reviews'
                }]
            },

            includePrice: {
                where: { status: 'active' },
                attributes: ['id', 'name', 'price', 'quantity', 'discount', 'discountedPrice', 'storeId', 'images'],
            },

        }
    });

    // To automatically recalculate discounted price, 
    // when discount is applied either to product directly or from stroe 
    Product.beforeSave(async (product, options) => {
        if (product.changed('discount')) {
            const price = parseFloat(product.price);
            const discount = parseFloat(product.discount);

            // Fetch the current store discount for the product's store
            const store = await Brand.findByPk(product.storeId, {
                include: {
                    model: StoreDiscount,
                    as: 'storeDiscounts',
                    where: {
                        status: 'active',
                    }
                }
            });
            const storeDiscount = store?.storeDiscounts; // the association alias is 'StoreDiscount'

            if (storeDiscount) {
                const discountType = storeDiscount.type;

                if (discountType === 'percentage') {
                    product.discountedPrice = (price * (1 - storeDiscount.value / 100)).toFixed(2);
                } else if (discountType === 'amount') {
                    const totalProductPrice = price; // Use the product price as the total product price for amount discount
                    product.discountedPrice = (totalProductPrice - storeDiscount.value).toFixed(2);
                }
            } else {
                // No store discount available, use the original calculation
                product.discountedPrice = (price * (1 - discount / 100)).toFixed(2);
            }
        }
    });

    const Category = sequelize.define("Category", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: { type: DataTypes.TEXT },
        image: {
            type: DataTypes.STRING,
        },
        status: {
            type: DataTypes.ENUM(["active", "inactive"]),
            defaultValue: "active",
            allowNull: false
        },
    }, {
        tableName: 'Category',
        timestamps: true,
        scopes: {
            includeProducts: {
                include: [{
                    model: Product,
                    as: 'products'
                }]
            }
        }
    });

    const Cart = sequelize.define("Cart", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        items: {
            type: DataTypes.JSONB },
        checkoutData: { type: DataTypes.JSONB },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        isWishList: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'Cart',
        timestamps: true,
        scopes: {
            includeProduct: {
                include: [{
                    model: Product,
                    as: 'product'
                }]
            }
        },
    });

    Cart.prototype.addChild = async function (childCart) {
        return await this.addWishlist(childCart);
    };

    const StoreDiscount = sequelize.define("StoreDiscount", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM(["percentage", "amount"]),
            defaultValue: "percentage",
            allowNull: false
        },
        value: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(["active", "inactive"]),
            defaultValue: "inactive",
            allowNull: false
        },
        minSpend: {
            type: DataTypes.FLOAT,
        },
        maxSpend: {
            type: DataTypes.FLOAT,
        },
        startDate: {
            type: DataTypes.DATE,
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        usageLimitPerPerson: {
            type: DataTypes.INTEGER
        },
        usageLimitPerDiscount: {
            type: DataTypes.INTEGER
        },
        categoryIds: {
            type: DataTypes.ARRAY(DataTypes.UUID)},
    }, {
        tableName: 'StoreDiscount',
        timestamps: true,
        scopes: {
            includeStore: {
                include: [{
                    model: Brand,
                    as: 'store'
                }]
            }
        }
    });

    StoreDiscount.afterUpdate(async (storeDiscount) => {
        if (storeDiscount.status === 'active') {
            let products
            //  check if the store discount is for a specific category
            if (storeDiscount.categoryIds.length > 0) {
                console.log('categoryIds', storeDiscount.categoryIds);
                //  get all products in the category
                products = await Product.findAll({
                    where: {
                        categoryId: storeDiscount.categoryIds,
                        storeId: storeDiscount.storeId
                    }
                });
            } else {
                products = await Product.findAll({ where: { storeId: storeDiscount.storeId } });
            }

            console.log('products', JSON.parse(JSON.stringify(products)));
            const productIds = products.map((product) => product.id);
            const discountType = storeDiscount.type;

            if (discountType === 'percentage') {
                await Product.update(
                    { discount: storeDiscount.value },
                    { where: { id: productIds } }
                );
            } else if (discountType === 'amount') {
                products.forEach(async (product) => {
                    if (parseFloat(product.price) <= storeDiscount.value) {
                        await Product.update(
                            { discount: 0 },
                            { where: { id: product.id } }
                        );
                    } else {
                        const discountValue = (storeDiscount.value / parseFloat(product.price)) * 100;
                        await Product.update(
                            { discount: discountValue },
                            { where: { id: product.id } }
                        );
                    }
                });
            }
        } else {
            let products
            //  check if the store discount is for a specific category
            if (storeDiscount.categoryIds.length > 0) {
                console.log('categoryIds', storeDiscount.categoryIds);
                //  get all products in the category
                products = await Product.findAll({
                    where: {
                        categoryId: storeDiscount.categoryIds,
                        storeId: storeDiscount.storeId
                    }
                });
            } else {
                products = await Product.findAll({ where: { storeId: storeDiscount.storeId } });
            }

            console.log('products', JSON.parse(JSON.stringify(products)));
            const productIds = products.map((product) => product.id);
            await Product.update(
                { discount: 0 }, // Remove the discount by setting it to null or any other appropriate value
                { where: { id: productIds } }
            );
        }
    });

    StoreDiscount.beforeDestroy(async (storeDiscount) => {
        if (storeDiscount.status === 'active') {
            let products
            //  check if the store discount is for a specific category
            if (storeDiscount.categoryIds.length > 0) {
                console.log('categoryIds', storeDiscount.categoryIds);
                //  get all products in the category
                products = await Product.findAll({
                    where: {
                        categoryId: storeDiscount.categoryIds,
                        storeId: storeDiscount.storeId
                    }
                });
            } else {
                products = await Product.findAll({ where: { storeId: storeDiscount.storeId } });
            }

            const productIds = products.map((product) => product.id);

            await Product.update(
                { discount: 0 }, // Remove the discount by setting it to null or any other appropriate value
                { where: { id: productIds } }
            );
        }
    });

    // ===========  ASSOCATIONS  ========= //
    Category.associate = (models) => {
        Category.hasMany(models.Product, {
            foreignKey: 'categoryId',
            as: 'products'
        });
    };

    Product.associate = (models) => {
        Product.belongsTo(models.Category, {
            foreignKey: 'categoryId',
            as: 'category'
        });
        Product.belongsTo(models.Brand, {
            foreignKey: 'storeId',
            as: 'store'
        });
        Product.hasMany(models.Review, {
            foreignKey: 'productId',
            as: 'reviews'
        });
    };
    Cart.associate = (models) => {
        Cart.belongsTo(models.User, {
            foreignKey: 'userId',
        });
        // self association
        Cart.belongsTo(models.Cart, {
            foreignKey: 'parentId',
            as: 'parent'
        });
        Cart.hasMany(models.Cart, {
            foreignKey: 'parentId',
            as: 'Wishlists'
        });
    };

    StoreDiscount.associate = (models) => {
        StoreDiscount.belongsTo(models.Brand, {
            foreignKey: 'storeId',
            as: 'store'
        });
    };


    return { Category, Product, Cart, StoreDiscount };
}