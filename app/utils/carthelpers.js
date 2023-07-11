const { Product, User, Brand, Category, Cart, DeliveryAddress } = require('../../models');

require('dotenv').config();

const { BadRequestError, NotFoundError, ForbiddenError } = require('./customErrors');


const convertcart = async (cart, type) => {
    const { items } = cart;
    const itemIds = items.map(item => item.id);
    const productsPromise = Product.scope('defaultScope', 'includeBrand').findAll({
        where: { id: itemIds }
    });
    const products = await productsPromise;

    if (products.length === 0) {
        throw new BadRequestError("Please add a valid product to the cart.");
    }

    // const sortedCart = new Map();
    let totalAmount = 0;
    let itemsProcessed = 0;
    let outOfStockItems = 0;
    let errors = [];
    let itemsNotFound = 0;
    let invalidQuantity = 0;

    await Promise.all(
        items.map(async item => {
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
                        UnitPrice: product.price,
                        discount: product.discount,
                        image: product.images,
                        Discountprice: price,
                        status: itemStatus,
                        store: storeId,
                        storeName: product.store.name,
                    }
                };

                if (type === 'checkout') {
                    // add info to newItem
                    const { specifications, description } = product;

                    newItem.info.weight = specifications.weight;
                    newItem.info.description = description;
                    newItem.info.category = specifications.shippingcategory_id;
                }

                // sortedCart.set(product.id, cartQuantity);

                if (itemStatus === 'instock') {
                    totalAmount += price * cartQuantity;
                    itemsProcessed++;
                } else if (itemStatus === 'outofstock') {
                    errors.push(`Product - ${product.name} is out of stock`);
                    outOfStockItems++;
                }

                Object.assign(item, newItem);
            } else if (cartQuantity < 1 || cartQuantity === 0) {
                errors.push(`Product - ${product.name} has an invalid quantity`);
                invalidQuantity++;
            }
        })
    );

    cart.totalAmount = totalAmount;
    cart.errors = errors;
    // cart.sortedCart = Object.fromEntries(sortedCart);
    cart.analytics = {
        totalItemsAdded: itemIds.length,
        totalItemsProcessed: itemsProcessed,
        totalItemsNotFound: itemsNotFound,
        totalItemsOutOfStock: outOfStockItems,
        totalItemsInvalidQuantity: invalidQuantity,
    };

    return cart;
}

const checkCartStore = async (items) => {
    console.log("items ======", items)
    // check if items is an array
    if (!Array.isArray(items)) {
        throw new BadRequestError("Unprocessable Cart Items");
    }

    const storeValues = items.map(item => item.info.store);
    const uniqueStores = [...new Set(storeValues)];

    if (uniqueStores.length !== 1) {
        const errorStores = uniqueStores.filter(store => !storeValues.includes(store));
        console.log('errorstores ==== ', errorStores)
        const storeNames = errorStores.map(store => store.info.storeName);
        console.log("storenames ======", storeNames)
        throw new BadRequestError(`Items have different stores: ${storeNames.join(", ")}, Select Items from one store only.`);
    }
    console.log("uniquestoresSingle ======", uniqueStores)

    const store = uniqueStores[0];
    return { store };
};

const estimateBoxDimensions = async (items, boxSizes) => {
    // Calculate the accumulated weight of all items and 
    // select the category of the item with the higst weight
    const { accumulatedWeight, selectedCategory } = items.reduce(
        (accumulator, item) => {
            const sum = accumulator.accumulatedWeight + item.total_weight;
            const selected = item.total_weight > accumulator.selectedCategory.total_weight ? { total_weight: item.total_weight, category: item.category } : accumulator.selectedCategory;
            return { accumulatedWeight: sum, selectedCategory: selected };
        },
        { accumulatedWeight: 0, selectedCategory: { total_weight: 0, category: null } }
    );

    package_category = selectedCategory.category;

    console.log("Accumulated Weight:", accumulatedWeight);
    console.log("Selected Category:", selectedCategory.category);


    // Extract the boxes with their names and weights from boxSizes array
    const filtered = boxSizes.filter(box => box.max_weight >= accumulatedWeight)
    const suitableMaxWeights = filtered.map(box => ({
        name: box.name,
        weight: box.max_weight
    }));

    // check if the filtered array is empty
    let selectedBox;
    if (filtered.length === 0) {
        // get box with highest volume
        const maxfilter = boxSizes.reduce((max, box) => {
            const volume = box.height * box.width * box.length;
            return volume > max.volume ? { volume, box } : max;
        }, { volume: 0, box: null });

        selectedBox = maxfilter.box;
    } else {
        // Find the box with the closest weight to the accumulated weight
        const closestWeight = suitableMaxWeights.reduce((closest, weight) => {
            const weightDifference = Math.abs(weight.weight - accumulatedWeight);
            const closestDifference = Math.abs(closest.weight - accumulatedWeight);
            return weightDifference < closestDifference ? weight : closest;
        });

        // Find the box with the closestWeight in the boxSizes array
        selectedBox = boxSizes.find(box => box.name === closestWeight.name && box.max_weight === closestWeight.weight);
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

    return {dimensions, package_category};
};

module.exports = {
    convertcart,
    checkCartStore,
    estimateBoxDimensions
}