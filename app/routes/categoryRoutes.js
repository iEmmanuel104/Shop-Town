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
router.get('/getAll', getCategories);
router.get('/:id', getCategory);
router.put('/update/:id', updateCategory);
router.delete('/delete/:id', deleteCategory);

module.exports = router