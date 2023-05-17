const axios = require('axios');
const { DeliveryAddress } = require('../../models');
const { BadRequestError } = require('./customErrors');

const validateAddress = async (details) => {
    console.log('ship bubble api called');
    let data = JSON.stringify({
        "name": details.name,
        "email": details.email,
        "phone": details.phone,
        "address": details.address
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/address/validate',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sb_sandbox_d1736e48887d79f702c29800aa85f858078618ad20679b2a54f46d604d655763'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log(response.data);
        const address_code = response.data.data.address_code;
        console.log("address code api", address_code);
        return address_code;
    } catch (error) {
        console.log(error);
        throw new BadRequestError('Error validating address');
    }
};




module.exports = {
    validateAddress
}