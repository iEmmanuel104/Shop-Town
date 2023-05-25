const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')

const {
    fundWallet,
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
} = require('../controllers/wallet.controller')

router.route('/')
    .post(basicAuth, fundWallet)
    .get(basicAuth, getWallets)

router.route('/transactions')
    .get(basicAuth, getWalletTransactions)

router.route('/balance')
    .get(basicAuth, getWalletBalance)   

router.route('/:id')
    .get(basicAuth, getWallet)

router.route('/receipt/:id')
    .get(basicAuth, generatereceipt)

router.route('/payout/banks')
    .get(basicAuth, getallPayoutBanks)

router.route('/payout/fee')
    .get(basicAuth, getpayoutfee)

router.route('/payout/status/:id')
    .get(basicAuth, checkTransferStatus)

router.route('/payout')
    .post(basicAuth, walletPayout)

router.route('/flutterwave/callback')
    .post(flutterwavecallback)

module.exports = router