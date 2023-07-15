module.exports = (sequelize, DataTypes) => {
    const { generateCode } = require('../app/utils/stringGenerators');
    const { createshipment } = require('../app/services/shipbubble.service');
    const Order = sequelize.define(
        'Order',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            cartdetails: {
                type: DataTypes.JSONB, // cart item prices with shipping fees
                allowNull: false,
            },
            shippingMethod: {
                type: DataTypes.STRING, // "kship" | "seller" | "ksecure"
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM(['pending', 'active', 'completed', 'cancelled']),
                defaultValue: 'pending',
                allowNull: false,
            },
            orderNumber: {
                type: DataTypes.STRING,
                defaultValue: `#K-ID${generateCode(6)}`,
            },
            kSecureFee: {
                type: DataTypes.DECIMAL(10, 2), // 10 digits in total, 2 after decimal point
            },
        },
        {
            tableName: 'Order',
            timestamps: true,
        },
    );

    const ShipbubbleOrder = sequelize.define(
        'ShipbubbleOrder',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            requestToken: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            courierInfo: {
                type: DataTypes.JSONB, // { courierId: 0, courierName: "", serviceCode: 0, isCodAvailable: false, total: 0  }
            },
            checkoutDetails: {
                type: DataTypes.JSONB, // buyer and seller info from shipbubble
            },
            deliveryFee: {
                type: DataTypes.VIRTUAL,
                get() {
                    if (this.courierInfo === undefined || this.courierInfo === null) return 0;
                    return this.courierInfo.total;
                },
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: 'pending', // pending, confirmed, picked_up, in_transit, completed, cancelled
                allowNull: false,
            },
            shippingReference: {
                type: DataTypes.STRING, // id from shipbubble
                allowNull: true,
            },
            trackingUrl: {
                type: DataTypes.STRING, // url from shipbubble
                allowNull: true,
            },
        },
        {
            tableName: 'ShipbubbleOrder',
            timestamps: true,
        },
    );

    const Review = sequelize.define(
        'Review',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            comment: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
        },
        {
            tableName: 'Review',
            timestamps: true,
        },
    );

    const Payment = sequelize.define(
        'Payment',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            paymentMethod: {
                type: DataTypes.STRING,
                validate: {
                    isIn: {
                        args: [['card', 'kcredit', 'cash']],
                        msg: 'Payment method must be card, kcredit or cash',
                    },
                },
                allowNull: false,
            },
            paymentService: {
                type: DataTypes.STRING, // flutterwave, seerbit,
                // restrict to flutterwave or seerbit
                validate: {
                    isIn: {
                        args: [['flutterwave', 'seerbit']],
                        msg: 'Payment service must be flutterwave or seerbit',
                    },
                },
            },
            paymentStatus: {
                type: DataTypes.ENUM(['pending', 'success', 'failed', 'cancelled']),
                defaultValue: 'pending',
                allowNull: false,
            },
            paymentType: {
                type: DataTypes.STRING, // "deposit" | "withdrawal" | "order"
                allowNull: false,
                validate: {
                    isIn: {
                        args: [['deposit', 'withdrawal', 'order']],
                        msg: 'Payment type must be deposit, withdrawal or order',
                    },
                },
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2), // 10 digits in total, 2 after decimal point
                allowNull: false,
            },
            paymentReference: {
                type: DataTypes.STRING, // id from flutterwave
                allowNull: true,
            },
        },
        {
            tableName: 'Payment',
            timestamps: true,
        },
    );

    Order.prototype.createShipment = async function (shippingObject) {
        const { courierInfo, requestToken, serviceType, shippingMethod, orderId } = shippingObject;

        const shipment = await createshipment({
            request_token: requestToken,
            service_code: courierInfo.serviceCode,
            courier_id: courierInfo.courierId,
        });

        // update the order status to active
        this.status = 'active';
        await this.save();

        // create a shipbubble order
        if (shippingMethod === 'kship' || shippingMethod === 'ksecure') {
            await ShipbubbleOrder.create({
                ...shippingObject,
                status: shipment.status,
                shippingReference: shipment.order_id,
                trackingUrl: shipment.tracking_url,
                orderId,
            });
        }

        // generate payment record
        await Payment.create({
            paymentMethod: shippingMethod,
            paymentService: serviceType,
            paymentStatus: shippingMethod === 'kcredit' ? 'success' : 'pending',
            paymentType: 'order',
            amount: shipment.payment.shipping_fee,
            paymentReference: shipment.order_id,
            orderId,
        });

        const deliveryFee = shipment.payment.shipping_fee;
        const trackingUrl = shipment.tracking_url;

        return { deliveryFee, trackingUrl };
    };

    // ================== ASSOCIATIONS ================== //

    Order.associate = (models) => {
        Order.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
            onUpdate: 'CASCADE',
        });
        Order.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
        Order.hasOne(models.ShipbubbleOrder, {
            foreignKey: 'orderId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
        Order.hasOne(models.Payment, {
            foreignKey: 'orderId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
        Order.hasOne(models.Review, {
            foreignKey: 'orderId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    Review.associate = (models) => {
        Review.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product',
        });
    };

    ShipbubbleOrder.associate = (models) => {
        ShipbubbleOrder.belongsTo(models.Order, {
            foreignKey: 'orderId',
        });
    };

    Payment.associate = (models) => {
        Payment.belongsTo(models.Order, {
            foreignKey: 'orderId',
        });
        Payment.belongsTo(models.Wallet, {
            foreignKey: 'walletId',
        });
    };

    return { Order, Review, Payment, ShipbubbleOrder };
};
