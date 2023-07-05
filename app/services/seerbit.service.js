const axios = require('axios');
const { SEERBIT_SECRET_KEY, SEERBIT_PUBLIC_KEY, SEERBIT_REDIRECT_URL, LOGO } = require('../utils/configs');
const { BadRequestError, UnprocessableEntityError } = require('../utils/customErrors');
const { Order } = require('../../models')
const { exec } = require('child_process');


const GenerateSeerbitKey = async () => {

        let data = JSON.stringify({
            "key": `${SEERBIT_SECRET_KEY}.${SEERBIT_PUBLIC_KEY}`,
        });
        // console.log("dataaaa", data)
        // console.log("data", `${SEERBIT_SECRET_KEY}.${SEERBIT_PUBLIC_KEY}`)

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://seerbitapi.com/api/v2/encrypt/keys',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer UROEbxhymQzrOrFOMSrjbFvv/rLBRHe388h/eabFouMjwzdOi25KrqGQXW7F4CyO52dp6+4uHHREZy+DZZ6ulC51zZCRV0IjkSZfn4m79ZJLseQ3QEsz9Ft1PFnJzFMK'
            },
            data: data
        };

        return new Promise((resolve, reject) => {
            axios.request(config)
                .then((response) => {
                    // console.log(JSON.stringify(response.data));
                    // console.log(response.data.status);
                    if (response.data.data.message == "Successful") {
                        const payments = response.data.data.EncryptedSecKey.encryptedKey;
                        console.log(":::::::::::::::::: payment redirect link ::::::::::::::::::", payments);
                        resolve(payments);
                    }
                })
                .catch((error) => {
                    console.log(error);
                    Order.destroy({ where: { id: paydetails.orderId } })
                    reject(new BadRequestError(`OOpss! Something went wrong. Please try again::::::::: ${error.response.data.message}`));
                });
        });
  

        // let link;

        // await axios.request(config)
        //     .then((response) => {
        //         // console.log(JSON.parse(JSON.stringify(response.data.data.EncryptedSecKey.encryptedKey)));
        //         link = response.data.data.EncryptedSecKey.encryptedKey;
        //     })
        //     .catch((error) => {
        //         console.log(error);     
        //         throw new BadRequestError(`OOpss! Something went wrong. Please try again::::::::: ${error.response.data.message}`);
        //     });

        // return link;


//     const curlCommand = `curl --location 'localhost:8082/order/' \
//   --header 'Content-Type: application/json' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQyMWY3MTY4LTVlNTktNGRhNS1hNjNmLTgxNWIxNjA1NmEyNyIsImZ1bGxOYW1lIjoiUG9wIEphbWVzIiwiZW1haWwiOiJraW5ncGVhY2UxMjM0NUBnbWFpbC5jb20iLCJyb2xlIjoiZ3Vlc3QiLCJpc0FjdGl2YXRlZCI6dHJ1ZSwidmVuZG9yTW9kZSI6dHJ1ZSwid2Vic2l0ZSI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsImp0aSI6IjNlOTU1NjRlLWM3NjQtNDM4Ny1iMGZkLWVmOTYwMDVmNDJiMSIsInN0b3JlSWQiOiI2ZDg3MjAwZC0xODgwLTQ5YWMtYjIxZi0wZWM4NTRlNjlkMTIiLCJpYXQiOjE2ODcwMDk3NDUsImV4cCI6MTcwMjU2MTc0NX0.g4oHz_ibxPhjGuK-WwT3XRaDLtMltpeBlp9qpBrv_So' \
//   --data '{
//       "shipping_method": "ksecure",
//       "storeId": "8c5e44e8-d599-419a-b2d2-1c9b8070b1d7",
//       "option": "CARD", 
//       "service": "SEERBIT" 
//   }'`;

//     await exec(curlCommand, (error, stdout, stderr) => {
//         if (error) {
//             console.error('Error:', error);
//             return;
//         }
//         console.log('Response::::::::::::::::::::::::::', stdout);

//     });
}

const SeerbitPay = async (paydetails) => {
    let title, meta = {};
    if (paydetails.storeName) {
        title = `${paydetails.storeName} Order Payment`
    } else { title = "Wallet Topup" }

    data = JSON.stringify({
        "publicKey": SEERBIT_PUBLIC_KEY,
        "amount": paydetails.amount,
        "currency": "NGN",
        "country": "NG",
        "paymentReference": paydetails.srb_trx_ref,
        "email": paydetails.email,
        "callbackUrl": SEERBIT_REDIRECT_URL,
    });

    const token = await GenerateSeerbitKey();
    console.log("token ========= ", token)

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://seerbitapi.com/api/v2/payments',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer UROEbxhymQzrOrFOMSrjbFvv/rLBRHe388h/eabFouMjwzdOi25KrqGQXW7F4CyO52dp6+4uHHREZy+DZZ6ulC51zZCRV0IjkSZfn4m79ZJLseQ3QEsz9Ft1PFnJzFMK`
            // 'Authorization': `Bearer ${token}`
        },
        data: data
    };


        return new Promise((resolve, reject) => {
            axios.request(config)
                .then((response) => {
                    console.log(JSON.stringify(response.data));
                    // console.log(response.data.status);
                    if (response.data.status === "SUCCESS") {
                        const payments = response.data.data.payments
                        console.log("payment redirect link",payments.redirectLink);
                        resolve(payments.redirectLink);
                    }
                })
                .catch((error) => {
                    console.log(error);
                    Order.destroy({ where: { id: paydetails.orderId } })
                    reject(new BadRequestError( `OOpss! Something went wrong. Please try again ::::::::: ${error.response.data.message}`));
                });
        });
    };








module.exports = {
    GenerateSeerbitKey,
    SeerbitPay
}