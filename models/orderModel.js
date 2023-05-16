module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define("Order", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
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
        scopes : {
            User : userId => ({
                where : { userId }
            })
        }

    });

    const KShip = sequelize.define("KShip", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(["placed", "accepted", "shipped", "delivered", "cancelled"]),
            defaultValue: "placed",
            allowNull: false
        },
        order: {
            type: DataTypes.STRING
        },
        orderId: {
            type: DataTypes.UUID,
            references: {
                model: 'Order',
                key: 'id'
            },
            allowNull: false
        },
        deliveryFee: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'KShip',
        timestamps: true,
    });

    const SellerShip = sequelize.define("SellerShip", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        sellerStatus: {
            type: DataTypes.ENUM(["pending","accepted", "rejected"]),
            defaultValue: "pending",
            allowNull: false
        },
        cause: {
            type: DataTypes.STRING,
        },
        orderId: {
            type: DataTypes.UUID,
            references: {
                model: 'Order',
                key: 'id'
            },
            allowNull: false
        },
    }, {
        tableName: 'SellerShip',
        timestamps: true,
    });

    const KsecureShip = sequelize.define("KsecureShip", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(["placed", "accepted", "shipped", "delivered", "cancelled"]),
            defaultValue: "placed",
            allowNull: false
        },
        order: {
            type: DataTypes.STRING
        },
        orderId: {
            type: DataTypes.UUID,
            references: {
                model: 'Order',
                key: 'id'
            },
            allowNull: false
        },
        deliveryFee: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        hasPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }, 
        paymentReference: {
            type: DataTypes.STRING,
            allowNull: true
        },
        orderReturn: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        kshipPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    }, {
        tableName: 'KsecureShip',
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
        Order.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
        Order.hasOne(models.KShip);
        Order.hasOne(models.SellerShip);
        Order.hasOne(models.KsecureShip);
        Order.hasOne(models.Payment);
        Order.hasOne(models.Review);
    }

    Review.associate = models => {
        Review.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });


    }

    KShip.associate = models => {
        KShip.belongsTo(models.Order);
    }

    SellerShip.associate = models => {
        SellerShip.belongsTo(models.Order);
    }

    KsecureShip.associate = models => {
        KsecureShip.belongsTo(models.Order);
    }

    return { Order, Review, KShip, SellerShip, KsecureShip, Payment };
}
