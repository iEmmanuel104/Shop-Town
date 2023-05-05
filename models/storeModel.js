module.exports = (sequelize, DataTypes) => {
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
                    model: 'Product',
                    as: 'products'
                }]
            }
        }
    });


    const Brand = sequelize.define("Brand", {
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
        socials: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            }
        },
        isDisabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
    }, {
        tableName: 'Brand',
        timestamps: true,
    });


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
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
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
            includeCategory: {
                include: [{
                    model: 'Category',
                    as: 'category'
                }]
            },
            includeBrand: {
                include: [{
                    model: 'Brand',
                    as: 'brand'
                }]
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

    Brand.associate = (models) => {
        Brand.hasMany(models.Product, {
            foreignKey: 'brandId',
            as: 'products'
        });
        Brand.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        Brand.hasOne(models.Content, {
            foreignKey: 'refId',
            as: 'brand'
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


    return { Category, Brand, Product }
}