const express = require('express')
const router = express.Router()
const { basicAuth } = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')


const {
    createBrand, getBrands, getBrand,
    updateBrand, deleteBrand, getBrandStaff,
    AddStoreDiscount, getStoreDiscounts,
    updateStoreDiscount, deleteStoreDiscount,
    increaseStoreProductPrice
} = require('../controllers/brand.controller');

router.post('/', basicAuth, createBrand)
    .get('/', getBrands)
    .get('/:id', getBrand)
    .put('/update/:id', basicAuth, uploadFile.single('file'), updateBrand)
    .delete('/delete/:id', basicAuth, deleteBrand)
    .get('/staff/:id', basicAuth, getBrandStaff)
    .post('/discount/:id', basicAuth, AddStoreDiscount)
    .get('/discount/:id', basicAuth, getStoreDiscounts)
    .put('/discount/:id', basicAuth, updateStoreDiscount)
    .delete('/discount/:id', basicAuth, deleteStoreDiscount)
    .put('/increase/:id', basicAuth, increaseStoreProductPrice)

module.exports = router