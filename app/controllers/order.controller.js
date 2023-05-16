const { Product, User, Brand, Category, Cart, KShip, SellerShip, KsecureShip, DeliveryAddress } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async')
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
const path = require('path');

const { v4: uuidv4 } = require('uuid');

const { sendEmail } = require('../utils/sendEmail');

const createOrder = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const userInfo = await User.findOne({ 
        where: { id: userId },
        include: [
            {
                model: Cart,
                as: 'cart',
            },
            {
                model: DeliveryAddress,
                where: {isDeault: true},
                as: 'deliveryAddress'
            }
        ]
     });
    if (!userInfo) {
        throw new NotFoundError('User not found');
    }
    const cart = userInfo.cart;
    if (!cart) {
        throw new NotFoundError('Cart not found');
    }
    const deliveryAddress = userInfo.deliveryAddress;
    if (!deliveryAddress) {
        throw new NotFoundError('Delivery address not found');
    }

    // query ship bubble api for shipping cost

    const order = await sequelize.transaction(async (t) => {
        const order = await userInfo.createOrder({
            userId,
            status: 'active',
            productId: cart.productId,                                                                                                                                                                                                                                                                                                                                                                                                                          
        }, { transaction: t });
        await cart.destroy({ transaction: t });
        return order;
    }
    );
    const orderInfo = await Order.findOne({
        where: { id: order.id },
        include: [
            {
                model: User,
                as: 'user'
            },
            {
                model: Product,
                as: 'product'
            },
            {
                model: KShip,
                as: 'kship'
            },
            {
                model: SellerShip,
                as: 'sellership'
            },
            {
                model: KsecureShip,
                as: 'ksecureship'
            },
            {
                model: Payment,
                as: 'payment'
            },
            {
                model: Review,
                as: 'review'
            }
        ]
    });
    res.status(200).json({
        success: true,
        data: orderInfo
    });
});

