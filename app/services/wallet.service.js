const {  User, Wallet, WalletTransaction, Brand } = require('../../models')
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
            brandId: id,
            balance: 0,
            type: type,
            isActive: true  
        });
        return wallet;
    }
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



module.exports = { generateWallet }
