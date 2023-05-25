const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')

const {
    createProduct,
    createBulkProducts,
    getProducts,
    getProduct,
    getshippingcategory,
    updateProduct,
    deleteProduct,
    searchProduct,
    updateProductdiscount
} = require('../controllers/product.controller')

// router.post('/', basicAuth, createProduct),
// router.post('/bulk', createBulkProducts)
// router.get('/', getProducts)
// router.get('/:id', getProduct)
// router.put('/:id', updateProduct)
// router.delete('/:id', deleteProduct)
// router.get('/search', searchProuct)
router.route('/')
    .post(basicAuth, createProduct)
    .get(getProducts)

router.route('/bulk')
    .post(basicAuth, createBulkProducts);

router.route('/:id')
    .get(getProduct)
    .put(basicAuth, updateProduct)
    .delete(basicAuth, deleteProduct)
    .patch(basicAuth, updateProductdiscount)

router.get('/search', searchProduct);

router.get('/shipping/category', getshippingcategory);

module.exports = router