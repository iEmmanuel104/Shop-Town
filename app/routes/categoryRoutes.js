const express = require('express')
const router = express.Router()

const {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/category.controller');

router.post('/create', createCategory);
router.get('/get', getCategories);
router.get('/get/:id', getCategory);
router.put('/update/:id', updateCategory);
router.delete('/delete/:id', deleteCategory);

module.exports = router