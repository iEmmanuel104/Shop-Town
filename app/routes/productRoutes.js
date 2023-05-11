const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')

const {
    createProduct,
    createBulkProducts,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    searchProduct
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
    .get(getProducts);

router.route('/bulk')
    .post(basicAuth, createBulkProducts);

router.route('/:id')
    .get(getProduct)
    .put(basicAuth, updateProduct)
    .delete(basicAuth, deleteProduct);

router.get('/search', searchProduct);

module.exports = router