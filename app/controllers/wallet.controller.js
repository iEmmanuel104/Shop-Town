const { Wallet, WalletTransaction, Payment, User } = require('../../models');
require('dotenv').config();
const { sequelize, Sequelize } = require('../../models');
const asyncWrapper = require('../middlewares/async');
const { FlutterwavePay, validateFlutterwavePay } = require('../services/flutterwave.service');
const { KSECURE_FEE } = require('../utils/configs');
// const queryString = require('query-string');
// const validator = require('validator');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getPagination, getPagingData } = require('../utils/pagination')
const Op = require("sequelize").Op;
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
            tx_ref: `WalletFund-${transaction.id}`,
        }
        const link = await FlutterwavePay(paydetails);
        console.log("return from flutterwave", link.data.link);
        let paymentLink = link.data.link;
        // // Increase the wallet balance
        // await Wallet.increment('amount', {
        //     by: amount,
        //     where: { id: wallet.id },
        // });

        res.status(200).json({
            success: true,
            message: 'Wallet fund request successful',
            data: { paymentLink }
        });
    });
});

const validateWalletFund = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const { tx_ref, transaction_id, status } = req.body;

    const transaction = await WalletTransaction.findOne({ where: { id: tx_ref.split('-')[1] } });
    if (!transaction) {
        throw new NotFoundError('Transaction not found');
    }
    if (transaction.status === 'success') {
        throw new BadRequestError('Transaction already validated');
    }
    let details = { transactionId: transaction_id, expectedAmount: req.body.amount }
    let validtrx, message;
    await sequelize.transaction(async (t) => {

        if (status === 'successful') {
            validtrx = await validateFlutterwavePay(details);
            // Increase the wallet balance
            await Wallet.increment('amount', {
                by: transaction.amount,
                where: { id: transaction.walletId },
            });
            // Update the transaction status
            await WalletTransaction.update({ status: 'success', transactionId: transaction_id }, { where: { id: transaction.id } });
            message = 'Wallet fund validated successfully';
        } else {
            await WalletTransaction.update({ status: 'failed', transactionId: transaction_id }, { where: { id: transaction.id } });
            message = 'Wallet fund validation failed';
        }

        res.status(200).json({ success: true, message: message });
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
        group: [sequelize.literal('DATE_TRUNC(\'month\', "createdAt")')],
    });

    res.status(200).json({ success: true, message: 'Wallet transactions fetched successfully', data: { transactions } });
});

const getWalletBalance = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    res.status(200).json({ success: true, message: 'Wallet balance fetched successfully', data: { balance: wallet.amount } });
});

const getWallet = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }
    res.status(200).json({ success: true, message: 'Wallet fetched successfully', data: { wallet } });
});

const getWallets = asyncWrapper(async (req, res, next) => {
    const decoded = req.decoded;
    const userId = decoded.id;
    const wallets = await Wallet.findAll({ where: { userId } });
    if (!wallets) {
        throw new NotFoundError('Wallet not found');
    }
    res.status(200).json({ success: true, message: 'Wallets fetched successfully', data: { wallets } });
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
    }

    res.status(200).json({ success: true, message: 'Receipt generated successfully', data: { receipt } });
});

// const walletPayout = asyncWrapper(async (req, res, next) => {