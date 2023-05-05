const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')

const {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
} = require('../controllers/brand.controller');

router.post('/create', basicAuth, createBrand);
router.get('/get', basicAuth, getBrands);
router.get('/get/:id', basicAuth, getBrand);
router.put('/update/:id', basicAuth, updateBrand);
router.delete('/delete/:id', basicAuth, deleteBrand);

module.exports = router