const { Wallet, WalletTransaction, Payment, User } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const {
    FlutterwavePay,
    validateFlutterwavePay,
    getflutterwavepayoutbanks,
    FlutterwaveTransferStatus,
    FlutterwaveTransferfee,
    FlutterwavePayout,
} = require('../services/flutterwave.service');
const { KSECURE_FEE } = require('../utils/configs');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination');
const Op = require('sequelize').Op;
const path = require('path');

const { v4: uuidv4 } = require('uuid');

const fundWallet = asyncWrapper(async (req, res, next) => {
    await sequelize.transaction(async (t) => {
        const decoded = req.decoded;
        const userId = decoded.id;
        const userInfo = await User.findOne({ where: { id: userId } });

        const { amount, reference, description } = req.body;

        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            throw new NotFoundError('Wallet not found');
        }
        // Create a new transaction record
        const transaction = await WalletTransaction.create({
            walletId: wallet.id,
            amount,
            reference,
            type: 'credit',
            status: 'pending',
            description,
        });

        // generate flutterwave ppayment link
        const paydetails = {
            amount: parseInt(amount),
            email: userInfo.email,
            phone: userInfo.phone,
            fullName: userInfo.fullName,
            tx_ref: `WalletFund_${transaction.id}`,
        };
        const link = await FlutterwavePay(paydetails);
        console.log('return from flutterwave', link.data.link);
        let paymentLink = link.data.link;
        // // Increase the wallet balance
        // await Wallet.increment('amount', {
        //     by: amount,
        //     where: { id: wallet.id },
        // }); status=successful&tx_ref=WalletFund-27aca5c3-5f06-438f-90a2-14688cf4413c&transaction_id=4349800

        return res.status(200).json({
            success: true,
            message: 'Wallet fund request successful',
            data: { paymentLink },
        });
    });
});

const validateWalletFund = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { tx_ref, transaction_id, status } = req.query;

    const transaction = await WalletTransaction.findOne({ where: { id: tx_ref.split('_')[1] } });
    if (!transaction) {
        throw new NotFoundError('Transaction not found');
    }
    if (transaction.status === 'success') {
        throw new BadRequestError('Transaction already validated');
    }
    let details = { transactionId: transaction_id };
    let validtrx, message;
    console.log('hererererer');
    await sequelize.transaction(async (t) => {
        if (status === 'successful') {
            validtrx = await validateFlutterwavePay(details);
            console.log('return from flutterwave', validtrx);
            // Increase the wallet balance
            await Wallet.increment('amount', {
                by: transaction.amount,
                where: { id: transaction.walletId },
            });
            // Update the transaction status
            await WalletTransaction.update(
                { status: 'success', reference: transaction_id },
                { where: { id: transaction.id } },
            );
            message = 'Wallet fund validated successfully';
        } else {
            await WalletTransaction.update(
                { status: 'failed', reference: transaction_id },
                { where: { id: transaction.id } },
            );
            message = 'Wallet fund validation failed';
        }

        return res.status(200).json({ success: true, message: message });
    });
});

const getWalletTransactions = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    const transactions = await WalletTransaction.findAll({
        where: { walletId: wallet.id },
        order: [['createdAt', 'DESC']],
        // group: [sequelize.literal('DATE_TRUNC(\'month\', "createdAt")')],
    });

    return res
        .status(200)
        .json({ success: true, message: 'Wallet transactions fetched successfully', data: { transactions } });
});

const getWalletBalance = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    return res
        .status(200)
        .json({ success: true, message: 'Wallet balance fetched successfully', data: { balance: wallet.amount } });
});

const getWallet = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    return res.status(200).json({ success: true, message: 'Wallet fetched successfully', data: { wallet } });
});

const getWallets = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallets = await Wallet.findAll({ where: { userId } });
    if (!wallets) {
        throw new NotFoundError('Wallet not found');
    }
    return res.status(200).json({ success: true, message: 'Wallets fetched successfully', data: { wallets } });
});

const generatereceipt = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { transactionId } = req.params;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    const transaction = await WalletTransaction.findOne({ where: { id: transactionId } });
    if (!transaction) {
        throw new NotFoundError('Transaction not found');
    }

    const receipt = {
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        currency: 'NGN',
        reference: transaction.reference,
        description: transaction.description,
        initiated: transaction.createdAt,
        completed: transaction.updatedAt,
    };

    return res.status(200).json({ success: true, message: 'Receipt generated successfully', data: { receipt } });
});

const getallPayoutBanks = asyncWrapper(async (req, res, next) => {
    const banks = await getflutterwavepayoutbanks();
    return res.status(200).json({ success: true, message: 'Banks fetched successfully', data: banks });
});

const getpayoutfee = asyncWrapper(async (req, res, next) => {
    const { amount } = req.query;
    const details = { amount: parseInt(amount) };
    const fee = FlutterwaveTransferfee(details);
    return res.status(200).json({ success: true, message: 'Fee fetched successfully', data: { fee } });
});

const checkTransferStatus = asyncWrapper(async (req, res, next) => {
    const { transferId } = req.query;
    const details = { transferId };
    const status = await FlutterwaveTransferStatus(details);
    return res.status(200).json({ success: true, message: 'Transfer status fetched successfully', data: { status } });
});

const walletPayout = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { amount, bankCode, accountNumber } = req.body;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    // const detailss = { amount: parseInt(amount)}
    // const fee = (await FlutterwaveTransferfee(detailss)) ? (await FlutterwaveTransferfee(detailss)) : 0;
    const totalAmount = parseInt(amount); //+ parseInt(fee);
    if (wallet.amount < totalAmount) {
        throw new BadRequestError('Insufficient wallet balance');
    }
    const details = {
        amount: parseInt(totalAmount),
        bankCode,
        accountNumber,
        narration: 'Wallet payout',
        reference: `WalletPayout_${uuidv4()}`,
    };
    // console.log(details)
    const transfer = await FlutterwavePayout(details);
    console.log(transfer);
    let message;
    await sequelize.transaction(async (t) => {
        if (transfer.status === 'success') {
            // Decrease the wallet balance
            // await Wallet.decrement('amount', {
            //     by: totalAmount,
            //     where: { id: wallet.id },
            // });
            // Create the transaction
            await WalletTransaction.create({
                walletId: wallet.id,
                type: 'debit',
                amount: totalAmount,
                status: 'pending',
                description: 'Wallet payout',
                reference: details.reference,
            });
            message = `Wallet payout initiated:${transfer.message}`;
        } else if (transfer.status === 'error') {
            await WalletTransaction.create({
                walletId: wallet.id,
                type: 'debit',
                amount: totalAmount,
                status: 'failed',
                description: 'Wallet payout',
                reference: details.reference,
            });
            message = `Wallet payout failed:${transfer.message}`;
        }
    });
    return res.status(200).json({ success: true, message: 'Wallet payout successful', data: { transfer } });
});

const flutterwavecallback = asyncWrapper(async (req) => {
    console.log(req);
    console.log(req.body);
});

module.exports = {
    fundWallet,
    validateWalletFund,
    getWalletTransactions,
    getWalletBalance,
    getWallet,
    getWallets,
    generatereceipt,
    getallPayoutBanks,
    getpayoutfee,
    checkTransferStatus,
    walletPayout,
    flutterwavecallback,
};
