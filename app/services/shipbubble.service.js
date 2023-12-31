const axios = require('axios');
const { BadRequestError } = require('../utils/customErrors');
const { SHIPBUBBLE_API_KEY } = require('../utils/configs');
const { sendShipbubblePaymentErrorEmail } = require('../utils/mailTemplates');

const validateAddress = async (details) => {
    console.log('ship bubble api called');
    const data = JSON.stringify({
        name: details.name,
        email: details.email,
        phone: details.phone,
        address: details.address,
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/address/validate',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
        },
        data,
    };

    try {
        const response = await axios.request(config);
        console.log(response.data);
        const addressCode = response.data.data.address_code;
        console.log('address code api', addressCode);
        return addressCode;
    } catch (error) {
        console.log(error.response.data);
        throw new BadRequestError('Error validating address: ' + error.response.data.message);
    }
};

const getShippingRates = async (details) => {
    const data = JSON.stringify({
        sender_address_code: details.senderAddressCode,
        reciever_address_code: details.receiverAddressCode,
        pickup_date: details.pickupDate,
        category_id: details.categoryId,
        package_items: details.packageItems,
        package_dimension: details.packageDimension,
        delivery_instructions: details.description,
        service_type: 'pickup',
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/fetch_rates',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
            Cookie: 'connect.sid=s%3A7grPYQxxTQAPVglRsI2jviUSaeOocGbR.Vb40e8CphHenTW7eb9SmjZDVAJmGNciuMEdUz8T8JvE',
        },
        data,
    };

    try {
        const response = await axios.request(config);
        const requestobject = {
            requestToken: response.data.data.request_token,
            cheapestCourier: response.data.data.cheapest_courier,
            allcouriers: response.data.data.couriers,
            kshipCourier: await findCourier(response.data.data),
            checkoutData: response.data.data.checkout_data,
        };
        return requestobject;
    } catch (error) {
        console.log('1');
        console.log('1', error.response.data);
        throw new BadRequestError(
            'Error getting shipping rates: ' +
                error.response.data.message +
                ' ' +
                'ERRORS: ' +
                error.response.data.errors,
        );
    }
};

const defaultlabels = {
    data: [
        {
            category_id: 98190590,
            category: 'Hot food',
        },
        {
            category_id: 24032950,
            category: 'Dry food and supplements',
        },
        {
            category_id: 77179563,
            category: 'Electronics and gadgets',
        },
        {
            category_id: 2178251,
            category: 'Groceries',
        },
        {
            category_id: 67658572,
            category: 'Sensitive items (ATM cards, documents)',
        },
        {
            category_id: 20754594,
            category: 'Light weight items',
        },
        {
            category_id: 67008831,
            category: 'Machinery',
        },
        {
            category_id: 57487393,
            category: 'Medical supplies',
        },
        {
            category_id: 99652979,
            category: 'Health and beauty',
        },
        {
            category_id: 25590994,
            category: 'Furniture and fittings',
        },
        {
            category_id: 74794423,
            category: 'Fashion wears',
        },
    ],
};

const getshippingcategories = async () => {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/labels/categories',
        headers: {
            Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
            Cookie: 'connect.sid=s%3A7grPYQxxTQAPVglRsI2jviUSaeOocGbR.Vb40e8CphHenTW7eb9SmjZDVAJmGNciuMEdUz8T8JvE',
        },
    };

    try {
        const response = await axios.request(config);
        console.log(response.data);
        return response.data.data;
    } catch (error) {
        console.log(error.response.data);
        return defaultlabels;
    }
};

const defaultboxes = {
    data: [
        {
            box_size_id: 8496812,
            name: 'Box 1',
            height: 5,
            width: 25.4,
            length: 25.4,
            max_weight: 1.5,
        },
        {
            box_size_id: 2006649,
            name: 'Box 2',
            height: 10,
            width: 10,
            length: 20,
            max_weight: 29,
        },
        {
            box_size_id: 7983229,
            name: 'Box 3',
            height: 20,
            width: 10,
            length: 10,
            max_weight: 29,
        },
        {
            box_size_id: 8739199,
            name: 'Box 4',
            height: 17.8,
            width: 20,
            length: 33,
            max_weight: 29,
        },
        {
            box_size_id: 3657652,
            name: 'Box 5',
            height: 20.5,
            width: 22.9,
            length: 30.5,
            max_weight: 29,
        },
        {
            box_size_id: 214835,
            name: 'Box 6',
            height: 20,
            width: 20,
            length: 30.5,
            max_weight: 29,
        },
        {
            box_size_id: 120880,
            name: 'Box 7',
            height: 25.4,
            width: 25.4,
            length: 30.5,
            max_weight: 29,
        },
        {
            box_size_id: 8062623,
            name: 'Box 8',
            height: 25.4,
            width: 30.5,
            length: 30.5,
            max_weight: 29,
        },
        {
            box_size_id: 5694697,
            name: 'Box 9',
            height: 33,
            width: 33,
            length: 33,
            max_weight: 29,
        },
    ],
};
const getshippingboxes = async () => {
    const axios = require('axios');

    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/labels/boxes',
        headers: {
            Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
            Cookie: 'connect.sid=s%3A3rMlhM0QHhkTvEjmnWpFfLyjnn0tD3zY.jmNfhy0UkGQtxKZGi8bBp7ipAWfLB7RY70NjVyycizY',
        },
    };

    try {
        const response = await axios.request(config);
        // console.log(response);
        return response.data;
    } catch (error) {
        console.log('error encountered returning default boxes');
        console.log(error.response.data);
        return defaultboxes;
    }
};

const createshipment = async (details) => {
    const data = JSON.stringify({
        request_token: details.request_token,
        service_code: details.service_code,
        courier_id: details.courier_id,
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.shipbubble.com/v1/shipping/labels',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
            Cookie: 'connect.sid=s%3Ag3JurJ5tS6rqUKrKuiUHBW8LM_YpI5hV.mXjdY0E3AqfZ8EeAdbNSrAB%2BnsMyO%2BYKVdTzVIGP80Y',
        },
        data,
    };

    try {
        const response = await axios.request(config);
        console.log(response.data);
        return response.data.data;
    } catch (error) {
        console.log(error.response.data);
        if (error.response.data.status === 'failed') {
            await getShippingRates({ message: `Error creating shipment due to ${error.response.data.message}` });
        } else {
            throw new BadRequestError('Error creating shipment, Please refresh shipping rates');
        }
    }
};
function findCourier(data) {
    const cheapestCourier = data.cheapest_courier;
    if (cheapestCourier.is_cod_available) {
        return cheapestCourier;
    } else {
        const couriers = data.couriers;
        const codAvailableCouriers = couriers.filter((courier) => courier.is_cod_available);
        if (codAvailableCouriers.length > 0) {
            return codAvailableCouriers.reduce((minCourier, courier) => {
                // find the cheapest courier that supports COD
                return courier.total < minCourier.total ? courier : minCourier; // return the courier with the lowest total
            });
        } else {
            return null;
        }
    }
}

module.exports = {
    validateAddress,
    getShippingRates,
    getshippingcategories,
    getshippingboxes,
    createshipment,
};
