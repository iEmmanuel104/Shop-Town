const express = require('express')
const router = express.Router()

const {
    createProduct,
    createBulkProducts,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    searchProuct
} = require('../controllers/product.controller')

router.post('/create', createProduct)
router.post('/create/bulk', createBulkProducts)
router.get('/get', getProducts)
router.get('/get/:id', getProduct)
router.put('/update/:id', updateProduct)
router.delete('/delete/:id', deleteProduct)
router.get('/search', searchProuct)

module.exports = router