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
            // 'Authorization': 'Bearer FLWSECK_TEST-524b5ca50966cff5b5afc9729dcdd31e-X'
        },
        body: JSON.stringify({
            "tx_ref": paydetails.tx_ref,
            "amount": paydetails.amount,
            "currency": "NGN",
            "redirect_url": FLW_REDIRECT_URL,
            "meta" : meta,
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
                reject(error);
            } else {
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
        if (response.data.status === "successful" ) {
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

const FlutterwaveRefund = async (details) => {
    try {
        const response = await flw.Refund.create(details);
        return response.data;
    } catch (error) {
        throw new BadRequestError('Error refunding payment: ' + error.message);
    }
};

const FlutterwaveTransfer = async (details) => {
    try {
        const response = await flw.Transfer.create(details);
        return response.data;
    } catch (error) {
        throw new BadRequestError('Error transferring payment: ' + error.message);
    }
};
    

module.exports = {
    FlutterwavePay,
    validateFlutterwavePay
};