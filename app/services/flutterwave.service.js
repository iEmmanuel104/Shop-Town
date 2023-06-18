const axios = require('axios');
const Flutterwave = require('flutterwave-node-v3');
const { FLW_SECRET_KEY, FLW_PUBLIC_KEY, FLW_REDIRECT_URL, LOGO } = require('../utils/configs');
const flw = new Flutterwave(FLW_PUBLIC_KEY, FLW_SECRET_KEY);
require('dotenv').config();
const request = require('request');
const { BadRequestError } = require('../utils/customErrors');

const FlutterwavePay = async (paydetails) => {
    let StoreLogo = paydetails.storeLogo ? paydetails.storeLogo : LOGO;
    let title, meta = {};
    if (paydetails.storeName) {
        title = `${paydetails.storeName} Order Payment`
        meta = {
            "shipping_id": paydetails.tx_ref,
            "is_ksecure": paydetails.isKSecure,
            "ksecure_fee": paydetails.kSecureFee,
            "shipping_fee": paydetails.shippingfee,
        }
    } else {
        title = "Wallet Topup"
    }


    var options = {
        'method': 'POST',
        'url': 'https://api.flutterwave.com/v3/payments',
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FLW_SECRET_KEY}`
        },
        body: JSON.stringify({
            "tx_ref": paydetails.tx_ref,
            "amount": paydetails.amount,
            "currency": "NGN",
            "redirect_url": FLW_REDIRECT_URL,
            "meta": meta,
            "customer": {
                "email": paydetails.email,
                "phonenumber": paydetails.phone,
                "name": paydetails.fullname
            },
            "customizations": {
                "title": title,
                "logo": StoreLogo
            }
        })

    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response) {
            if (error) {
                reject(new UnprocessableEntityError('Error initiating payment: ' + error.message));
            } else {
                console.log(response.body)
                resolve(JSON.parse(response.body));
            }
        });
    });
};

const validateFlutterwavePay = async (details) => {
    console.log('flutterwave verify called')
    console.log(details.transactionId)
    try {
        const response = await flw.Transaction.verify({ id: details.transactionId })
        if (response.data.status === "successful") {
            console.log('payment was successful')
            console.log(response.data)
            return response.data;
        }
        else {
            console.log('payment was not successful')
            console.log(response.data)
            return response.data;
        }
    } catch (error) {
        console.log(error)
        throw new BadRequestError('Error validating payment: ' + error.message);
    }
};

const getflutterwavepayoutbanks = async () => {
    var options = {
        'method': 'GET',
        'url': 'https://api.flutterwave.com/v3/banks/NG',
        'headers': {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`
        }
    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response) {
            if (error) {
                reject(new UnprocessableEntityError('Error getting banks: ' + error.message));
            } else {
                resolve(JSON.parse(response.body));
            }
        });
    });
};

const FlutterwaveTransferfee = async (details) => {
    try {
        const response = await flw.Transfer.fee({
            "amount": details.amount,
            "currency": 'NGN',
        });
        return response.data;
    } catch (error) {
        throw new BadRequestError('Error getting transfer fee: ' + error.message);
    }
};

const FlutterwaveTransferStatus = async (details) => {
    var options = {
        'method': 'GET',
        'url': `https://api.flutterwave.com/v3/transfers/${details.transferId} `,
        'headers': {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`
        }
    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response) {
            if (error) {
                reject(new UnprocessableEntityError('Error getting transfer status: ' + error.message));
            } else {
                resolve(JSON.parse(response.body));
            }
        });
    });
};

const FlutterwavePayout = async (details) => {
    const detailss = {
        account_bank: details.bankCode,
        account_number: details.accountNumber,
        amount: details.amount,
        currency: "NGN",
        debit_currency: "NGN",
        narration: details.narration,
        reference: details.reference,
        // callback_url: 'https://891e-102-89-22-59.ngrok-free.app/wallet/flutterwave/callback'
    };




    // var options = {
    //     'method': 'POST',
    //     'url': 'https://api.flutterwave.com/v3/transfers',
    //     'headers': {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${FLW_SECRET_KEY}`
    //         // 'Authorization': 'Bearer FLWSECK_TEST-524b5ca50966cff5b5afc9729dcdd31e-X'
    //     },
    //     body: JSON.stringify({
    //         "account_bank": details.bankCode,
    //         "account_number": details.accountNumber,
    //         "amount": details.amount,
    //         "currency": "NGN",
    //         "debit_currency": "NGN",
    //         "narration": details.narration,
    //         "reference": details.reference,
    //         // "callback_url": 'https://891e-102-89-22-59.ngrok-free.app/wallet/flutterwave/callback'
    //     })

    // };
    // return new Promise((resolve, reject) => {
    //     request(options, function (error, response) {
    //         if (error) {
    //             reject(error);
    //         } else {
    //             resolve(JSON.parse(response.body));
    //         }
    //     });
    // });
    const response = await flw.Transfer.initiate(detailss)
    console.log(response)
    if (response.status === "successful") {
        console.log('Transfer Queued successfully')
        // store data.id in db
        console.log(response.data)
        return response.data;
    }
    else {
        console.log('payment was not successful')
        console.log(response.data)
        return response.data;
    }
        
};

const FlutterwaveRefund = async (details) => {
    try {
        const response = await flw.Refund.create(details);
        return response.data;
    } catch (error) {
        throw new BadRequestError('Error refunding payment: ' + error.message);
    }
};



module.exports = {
    FlutterwavePay,
    validateFlutterwavePay,
    getflutterwavepayoutbanks,
    FlutterwaveTransferfee,
    FlutterwaveTransferStatus,
    FlutterwavePayout  
};