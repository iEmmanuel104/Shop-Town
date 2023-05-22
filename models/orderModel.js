module.exports = (sequelize, DataTypes) => {
    const { DeliveryAddress } = require('./userModel')(sequelize, DataTypes);
    const { Cart } = require('./storeModel')(sequelize, DataTypes);
    const Order = sequelize.define("Order", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        cartdetails: {
            type: DataTypes.JSONB, // cart item prices with shipping fees
            allowNull: false
        },
        storeId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        shippingMethod: {
            type: DataTypes.JSONB, // { type: "kship" | "seller" | "ksecure", fee: 0 }
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(["active", "completed", "cancelled"]),
            defaultValue: "active",
            allowNull: false
        },
    }, {
        tableName: 'Order', 
        timestamps: true,
    });

    const ShipbubbleOrder = sequelize.define("ShipbubbleOrder", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        requestToken: {
            type: DataTypes.STRING,
            allowNull: false
        },
        serviceCode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        courierId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        packageCost: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        isKSecure: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        kSecureFee: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        deliveryFee: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
    }, {
        tableName: 'ShipbubbleOrder',
        timestamps: true,
    });


    const Review = sequelize.define("Review", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: false
        },
    }, {
        tableName: 'Review',
        timestamps: true,
    });

    const Payment = sequelize.define("Payment", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        paymentMethod: {
            type: DataTypes.ENUM(["CARD", "CASH"]),
            defaultValue: "CARD",
            allowNull: false
        },
        paymentStatus: {
            type: DataTypes.ENUM(["pending", "paid", "failed", "cancelled"]),
            defaultValue: "pending",
            allowNull: false
        },
        paymentReference: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'Payment',
        timestamps: true,
    });


    // ================== ASSOCIATIONS ================== //

    Order.associate = models => {
        Order.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        Order.hasOne(models.ShipbubbleOrder, {
            foreignKey: 'orderId',
            });
        Order.hasOne(models.Payment);
        Order.hasOne(models.Review);
    }

    Review.associate = models => {
        Review.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    }

    ShipbubbleOrder.associate = models => {
        ShipbubbleOrder.belongsTo(models.Order, {
            foreignKey: 'orderId',
        });
    }

    return { Order, Review, Payment, ShipbubbleOrder }
}
