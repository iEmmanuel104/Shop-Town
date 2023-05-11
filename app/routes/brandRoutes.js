const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')

const {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
    getBrandStaff
} = require('../controllers/brand.controller');

router.post('/', basicAuth, createBrand);
router.get('/', getBrands);
router.get('/:id', getBrand);
router.put('/update/:id', basicAuth, updateBrand);
router.delete('/delete/:id', basicAuth, deleteBrand);
router.get('/staff/:id', basicAuth, getBrandStaff);

module.exports = router