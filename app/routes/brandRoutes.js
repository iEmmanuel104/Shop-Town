const express = require('express')
const router = express.Router()

const {
    createBrand,
    getBrands,
    getBrand,
    updateBrand,
    deleteBrand,
} = require('../controllers/brand.controller');

router.post('/create', createBrand);
router.get('/get', getBrands);
router.get('/get/:id', getBrand);
router.put('/update/:id', updateBrand);
router.delete('/delete/:id', deleteBrand);

module.exports = router