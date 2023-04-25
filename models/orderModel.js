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
        status: {
            type: DataTypes.ENUM(["placed", "accepted", "shipped", "delivered", "cancelled"]),
            defaultValue: "placed",
            allowNull: false
        },
        deliveryAddress: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveryEmail: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveryLocation: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveryMethod: {
            type: DataTypes.ENUM(["DELIVERY", "PICKUP"]),
            defaultValue: "DELIVERY",
            allowNull: false
        },
        deliveryFee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        deliveryDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        deliveryNote: {
            type: DataTypes.TEXT,
            allowNull: true
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
        tableName: 'Order',
        timestamps: true,
        scopes : {
            User : userId => ({
                where : { userId }
            })
        }

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


    Order.associate = models => {
        Order.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        Order.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    }

    Review.associate = models => {
        Review.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    }



    return { Order, Review };
}
