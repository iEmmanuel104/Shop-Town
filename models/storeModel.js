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


    return { Category, Product }
}