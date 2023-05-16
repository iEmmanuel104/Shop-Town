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

            includePrice : {
                attributes: ['id', 'name', 'price', 'quantity', 'discount', 'discountedPrice'],
            },

        }
    });

    // Hook to automatically recalculate discounted price when discount is applied
    Product.beforeSave((product, options) => {
        if (product.changed('discount')) {
            const price = parseFloat(product.price);
            const discount = parseFloat(product.discount);
            product.discountedPrice = (price * (1 - discount / 100)).toFixed(2);
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
        totalAmount: {
            type: DataTypes.FLOAT,
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
        hooks: {
            beforeSave: async (cart) => {
                const itemIds = Object.keys(cart.items);
                const products = await Product.scope('defaultScope', 'includePrice').findAll({
                    where: { id: itemIds }
                });
                let totalAmount = 0;

                products.forEach(product => {
                    const quantity = cart.items[product.id];
                    if (quantity) {
                        const price = product.discountedPrice ? product.discountedPrice : product.price;
                        const inStock = product.quantity.instock;
                        const itemStatus = inStock >= quantity.quantity ? 'instock' : 'outofstock';

                        cart.items[product.id] = {
                            id: product.id,
                            name: product.name,
                            price: price,
                            quantity: quantity.quantity,
                            discount: product.discount,
                            status: itemStatus
                        };
                        totalAmount += price * quantity.quantity;
                    }
                });

                cart.totalAmount = totalAmount;
            },

            afterFind: async (cart) => {
                if (!cart || !cart.items) {
                    return;
                }
                const itemIds = Object.keys(cart.items);
                const products = await Product.scope('defaultScope', 'includePrice').findAll({
                    where: { id: itemIds }
                });
                let totalAmount = 0;
                products.forEach(product => {
                    const quantity = cart.items[product.id];
                    console.log(quantity)
                    if (quantity) {
                        const price = product.discountedPrice ? product.discountedPrice : product.price;
                        console.log(product.discountedPrice)
                        const inStock = product.quantity.instock;
                        const cartItem = cart.items[product.id];

                        if (cartItem.price !== price) {
                            // If price changed, update the cart item
                            if (inStock >= quantity.quantity) {
                                cart.items[product.id] = {
                                    name: product.name,
                                    price: price,
                                    quantity: quantity.quantity,
                                    discount: product.discount,
                                    status: "instock"
                                };
                                console.log('case 1')
                                totalAmount += price * quantity.quantity;
                            } else {
                                cart.items[product.id] = {
                                    name: product.name,
                                    price: price,
                                    quantity: quantity.quantity,
                                    discount: product.discount,
                                    status: "outofstock"
                                };
                                console.log('case 2')

                                totalAmount += price * inStock;
                            }
                        } else {
                            // If price didn't change, use the existing cart item
                            console.log('case 0')
                            cart.items[product.id] = cartItem;
                            totalAmount += price * cartItem.quantity;
                        }
                    }
                });
                cart.totalAmount = totalAmount;
            }
        }
    });

    // ======  ASSOCATIONS  ====== //
    Category.associate = (models) => {
        Category.hasMany(models.Product, {
            foreignKey: 'categoryId',
            as: 'products'
        });
        Category.hasOne(models.Content, {
            foreignKey: 'refId',
            as: 'category'
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
        Product.hasOne(models.Content, {
            foreignKey: 'refId',
            as: 'product'
        });
        Product.hasMany(models.Order, {
            foreignKey: 'productId',
            as: 'orders'
        });
        Product.hasMany(models.Review, {
            foreignKey: 'productId',
            as: 'reviews'
        });
    };

    Cart.associate = (models) => {
        Cart.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };


    return { Category, Product, Cart };
}