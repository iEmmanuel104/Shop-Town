const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');

require('dotenv').config();

const { BadRequestError, NotFoundError, ForbiddenError } = require('./customErrors');


const convertcart = async (cart, type) => {
    const { items } = cart;
    const itemIds = Object.keys(items);
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds }
    });
    let totalAmount = 0, Itemsprocessed = 0,
        outofstockItems = 0, errors = [],
        Itemsnotfound = 0; invalidQuantity = 0;

    if (products.length === 0) { // if no product is found
        throw new BadRequestError("Please add a valid product to the cart.");
    }

    itemIds.forEach(itemId => {
        const product = products.find(p => p.id === itemId);
        if (!product) {
            errors.push(`Product with id: ${itemId} not found`);
            Itemsnotfound++;
            // remove the item from the cart
            delete items[itemId];
            return; // Move on to the next item
        }

        let cartquantity;
        if (type === 'get') {
            cartquantity = items[product.id].quantity;
        } else {
            cartquantity = items[product.id];
        }
        const storeId = product.storeId;

        if (cartquantity >= 1) {
            const price = product.discountedPrice ? product.discountedPrice : product.price;
            const inStock = product.quantity.instock;
            const itemStatus = inStock >= cartquantity ? 'instock' : 'outofstock';

            items[product.id] = {
                name: product.name,
                quantity: cartquantity,
                UnitPrice: product.price,
                discount: product.discount,
                image: product.images,
                Discountprice: price,
                status: itemStatus,
                store: storeId,
            };

            if (itemStatus === 'instock') {
                totalAmount += price * cartquantity;
                Itemsprocessed++;
            } else if (itemStatus === 'outofstock') {
                errors.push(`Product - ${product.name} is out of stock`); // Add error message
                outofstockItems++;
            }
        } else if (cartquantity < 1 || cartquantity === 0) {
            errors.push(`Product - ${product.name} has an invalid quantity`); // Add error message
            invalidQuantity++;
        }
    });

    cart.totalAmount = totalAmount;
    cart.errors = errors;
    cart.analytics = {
        totalItemsAdded: itemIds.length,
        totalItemsProcessed: Itemsprocessed,
        totalItemsNotFound: Itemsnotfound,
        totalItemsOutOfStock: outofstockItems,
        totalItemsInvalidQuantity: invalidQuantity,
    };

    return cart;
}


const groupCartItems = async (items, amt) => {
    const itemIds = Object.keys(items);

    if (itemIds.length === 0) throw new BadRequestError("Cart is empty");

    // Retrieve products based on itemIds
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds },
        attributes: ['id', 'name', 'specifications', 'description'],
    });

    if (products.length === 0) throw new BadRequestError("Please add a valid product to cart");

    const storeValues = Object.values(items).map(item => item.store);
    const uniqueStores = [...new Set(storeValues)];

    if (uniqueStores.length !== 1) {
        const errorStores = uniqueStores.filter(store => !storeValues.includes(store));
        const storeNames = await Promise.all(errorStores.map(async store => {
            const storeData = await Brand.findOne({ where: { id: store } });
            return storeData.name;
        }));
        throw new BadRequestError(`Items have different stores: ${storeNames.join(", ")}`);
    }
    console.log(uniqueStores)
    const store = uniqueStores[0];

    let groupedItems = {};

    Object.values(items).forEach(item => {
        const productId = Object.keys(items).find(key => items[key] === item);
        const product = products.find(product => product.id === productId);
        const { name, specifications, description } = product;

        const newItem = {
            ...item,
            productId, // Add the productId to the newItem
            name,
            specification: specifications,
            description
        };

        if (groupedItems[item.store]) {
            groupedItems[item.store].push(newItem);
        } else {
            groupedItems[item.store] = [newItem];
        }
    });

    groupedItems.totalAmount = amt;
    return groupedItems;
};

const estimateBoxDimensions = async (items, boxSizes) => {
    // Calculate the accumulated weight of all items
    const accumulatedWeight = await items.reduce((sum, item) => sum + item.total_weight, 0);

    // Extract the boxes with their names and weights from boxSizes array
    const filtered = await boxSizes.filter(box => box.max_weight >= accumulatedWeight)
    const suitableMaxWeights = await filtered.map(box => ({
        name: box.name,
        weight: box.max_weight
    }));

    // check if the filtered array is empty
    let selectedBox
    if (filtered.length === 0) {
        // get box with highest volume
        const maxfilter = await boxSizes.reduce((max, box) => {
            const volume = box.height * box.width * box.length;
            return volume > max.volume ? { volume, box } : max;
        }, { volume: 0, box: null });

        selectedBox = maxfilter.box;
    } else {
        const closestWeight = await suitableMaxWeights.reduce((closest, weight) => {
            const weightDifference = Math.abs(weight.weight - accumulatedWeight);
            const closestDifference = Math.abs(closest.weight - accumulatedWeight);
            return weightDifference < closestDifference ? weight : closest;
        });

        // Find the box with the closestWeight in the boxSizes array
        selectedBox = await boxSizes.find(box => box.name === closestWeight.name && box.max_weight === closestWeight.weight);
    }

    // Return the dimensions of the selected box
    const dimensions = {
        height: selectedBox.height,
        width: selectedBox.width,
        length: selectedBox.length
    };

    // Add description if the max box or shipping container is being used
    if (filtered.length === 0) {
        dimensions.description = 'item size exceeds all available boxes, max boxsize used';
    }

    return dimensions;
};

module.exports = {
    convertcart,
    groupCartItems,
    estimateBoxDimensions
}