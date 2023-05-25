module.exports = (sequelize, DataTypes) => {
    const { Brand } = require('./userModel')(sequelize, DataTypes);
    
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
                const price = parseFloat(this.getDataValue('price'));
                const discount = parseFloat(this.getDataValue('discount'));
                return (price * (1 - discount / 100)).toFixed(2);
            }
        },
        specifications: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        status: {
            type: DataTypes.ENUM(["ACTIVE", "INACTIVE"]),
            defaultValue: "ACTIVE",
            allowNull: false
        },
    }, {
        tableName: 'Product',
        timestamps: true,
        scopes: {
            Brand(brandId) {
                return {
                    where: { brandId }
                }
            },
            includeBrand: {
                include: [
                    {
                        model: Brand,
                        as: 'brand',
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
                attributes: ['id', 'name', 'price', 'quantity', 'discount', 'discountedPrice', 'brandId'],
            },

        }
    });

    // To automatically recalculate discounted price, 
    // when discount is applied either to product directly or from stroe 
    Product.beforeSave(async (product, options) => {
        if (product.changed('discount')) {
            const price = parseFloat(product.price);
            const discount = parseFloat(product.discount);

            // Fetch the current store discount for the product's brand
            const brand = await Brand.findByPk(product.brandId, {
                include: {
                    model: StoreDiscount,
                    as: 'storeDiscounts',
                    where: {
                        status: 'active',
                    }
                }
            });
            const storeDiscount = brand?.storeDiscounts; // Assuming the association alias is 'StoreDiscount'

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
        status: {
            type: DataTypes.ENUM(["ACTIVE", "INACTIVE"]),
            defaultValue: "ACTIVE",
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
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        checkoutData: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
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
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        usageLimitPerDiscount: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
    }, {
        tableName: 'StoreDiscount',
        timestamps: true,
        scopes: {
            includeStore: {
                include: [{
                    model: Brand,
                    as: 'brand'
                }]
            }
        }
    });

    StoreDiscount.afterUpdate(async (storeDiscount) => {
        if (storeDiscount.status === 'active') {
            const products = await Product.findAll({ where: { brandId: storeDiscount.brandId } });
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
        }
    });


    StoreDiscount.beforeDestroy(async (storeDiscount) => {
        if (storeDiscount.status === 'active') {
            const products = await Product.findAll({ where: { brandId: storeDiscount.brandId } });
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
            foreignKey: 'brandId',
            as: 'brand'
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
    };

    StoreDiscount.associate = (models) => {
        StoreDiscount.belongsTo(models.Brand, {
            foreignKey: 'brandId',
            as: 'brand'
        });
    };


    return { Category, Product, Cart, StoreDiscount };
}