const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')


const {
    createBrand, getBrands, getBrand,
    updateBrand, deleteBrand, getBrandStaff,
    AddStoreDiscount, getStoreDiscounts,
    updateStoreDiscount, deleteStoreDiscount,
    increaseStoreProductPrice, addStoreAccount
} = require('../controllers/brand.controller');

router.post('/', basicAuth, createBrand);
router.get('/', getBrands);
router.get('/:id', getBrand);
router.put('/update/:id', basicAuth, uploadFile.single('file'), updateBrand);
router.delete('/delete/:id', basicAuth, deleteBrand);
router.get('/staff/:id', basicAuth, getBrandStaff);
router.post('/discount/add/:id', basicAuth, AddStoreDiscount);
router.get('/discount/:id', basicAuth, getStoreDiscounts);
router.put('/discount/update/:id', basicAuth, updateStoreDiscount);
router.delete('/discount/delete/:id', basicAuth, deleteStoreDiscount);
router.post('/increase/:id', basicAuth, increaseStoreProductPrice);
router.post('/account/add/:id', basicAuth, addStoreAccount);


module.exports = router