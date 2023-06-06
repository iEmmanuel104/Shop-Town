const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')


const {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
    getBrandStaff,
    AddStoreDiscount,
    getStoreDiscounts,
    updateStoreDiscount,
    deleteStoreDiscount
} = require('../controllers/brand.controller');

router.post('/', basicAuth, createBrand);
router.get('/', getBrands);
router.get('/:id', getBrand);
router.put('/update/:id', basicAuth, uploadFile.single('file'), updateBrand);
router.delete('/delete/:id', basicAuth, deleteBrand);
router.get('/staff/:id', basicAuth, getBrandStaff);
router.post('/discount/:id', basicAuth, AddStoreDiscount);
router.get('/discount/:id', basicAuth, getStoreDiscounts);
router.put('/discount/:id', basicAuth, updateStoreDiscount);
router.delete('/discount/:id', basicAuth, deleteStoreDiscount);
module.exports = router