const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');

require('dotenv').config();

const { BadRequestError, NotFoundError, ForbiddenError } = require('./customErrors');


const convertcart = async (cart, type) => {
    const { items } = cart;
    const itemIds = items.map(item => item.id);
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds }
    });
    let totalAmount = 0,
        itemsProcessed = 0,
        outOfStockItems = 0,
        errors = [],
        itemsNotFound = 0,
        invalidQuantity = 0;

    if (products.length === 0) {
        throw new BadRequestError("Please add a valid product to the cart.");
    }

    let sortedCart = {};

    items.forEach(item => {
        const product = products.find(p => p.id === item.id);

        if (!product) {
            errors.push(`Product with id: ${item.id} not found`);
            itemsNotFound++;
            return;
        }

        let cartQuantity = item.count;
        let storeId = product.storeId;

        if (cartQuantity >= 1) {
            const price = product.discountedPrice ? product.discountedPrice : product.price;
            const inStock = product.quantity.instock;
            const itemStatus = inStock >= cartQuantity ? 'instock' : 'outofstock';

            const newItem = {
                id: product.id,
                count: cartQuantity,
                info: {
                    name: product.name,
                    quantity: cartQuantity,
                    UnitPrice: product.price,
                    discount: product.discount,
                    image: product.images,
                    Discountprice: price,
                    status: itemStatus,
                    store: storeId,
                }
            };

            sortedCart[product.id] = cartQuantity;

            if (itemStatus === 'instock') {
                totalAmount += price * cartQuantity;
                itemsProcessed++;
            } else if (itemStatus === 'outofstock') {
                errors.push(`Product - ${product.name} is out of stock`);
                outOfStockItems++;
            }

            items[items.indexOf(item)] = newItem;
        } else if (cartQuantity < 1 || cartQuantity === 0) {
            errors.push(`Product - ${product.name} has an invalid quantity`);
            invalidQuantity++;
        }
    });

    cart.totalAmount = totalAmount;
    cart.errors = errors;
    cart.sortedCart = sortedCart;
    cart.analytics = {
        totalItemsAdded: itemIds.length,
        totalItemsProcessed: itemsProcessed,
        totalItemsNotFound: itemsNotFound,
        totalItemsOutOfStock: outOfStockItems,
        totalItemsInvalidQuantity: invalidQuantity,
    };

    return cart;
}



const groupCartItems = async (items) => {
    const itemIds = items.map(item => item.id);
    if (itemIds.length === 0) throw new BadRequestError("Cart is empty");

    // Retrieve products based on itemIds
    const products = await Product.scope('defaultScope', 'includePrice').findAll({
        where: { id: itemIds },
        attributes: ['id', 'name', 'specifications', 'description'],
    });

    if (products.length === 0) throw new BadRequestError("Please add a valid product to cart");

    const storeValues = items.map(item => item.info.store);
    const uniqueStores = [...new Set(storeValues)];
    console.log("uniquestores ======", uniqueStores)
    if (uniqueStores.length !== 1) {
        const errorStores = uniqueStores.filter(store => !storeValues.includes(store));
        console.log('errorstores ==== ', errorStores)
        const storeNames = await Promise.all(errorStores.map(async store => {
            const storeData = await Brand.findOne({ where: { id: store } });
            return storeData.name;
        }));
        console.log("storenames ======", storeNames)
        throw new BadRequestError(`Items have different stores: ${storeNames.join(", ")}`);
    }
    console.log("uniquestoresSingle ======", uniqueStores)
    const store = uniqueStores[0];

    let groupedItems = {
        store: store,
        items: [],
    };

    items.forEach(item => {
        const productId = item.id;
        const product = products.find(product => product.id === productId);
        const { specifications, description } = product;

        // update the item with the product details
        const shipping = {
            id: productId,
            name: product.name,
            weight: specifications.weight,
            description: description,
            category: specifications.shippingcategory_id,
            discountprice: item.info.Discountprice,
            quantity: item.info.quantity,
        };

        // add the new item to the groupedItems object
        groupedItems.items.push(shipping);

    });


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