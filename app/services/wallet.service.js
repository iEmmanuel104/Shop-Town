const {  User, Wallet, WalletTransaction, Brand, Cart } = require('../../models')
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const asyncWrapper = require('../middlewares/async')


const generateWallet = async (fields) => {
    const { id, type } = fields;
    console.log('type', type )
    if (type === 'customer') {
        const wallet = await Wallet.create({
            userId: id,
            type: type,
            isActive: true
        });
        return wallet;
    } else if (type === 'store') { 
        const wallet = await Wallet.create({
            storeId: id,
            balance: 0,
            type: type,
            isActive: true  
        });
        return wallet;
    }
};

const createCart = async (userId) => {
    const cart = await Cart.create({
        userId: userId,
    });
    return cart;
};


// const NewpaymentEntry = async (fields) => {
//     const { 
//         method,
//         amount,
//         reference,
//         status,
//         type,
//         userId,
//      } = fields;

//     const payment = await WalletTransaction.create({



module.exports = { generateWallet, createCart }
