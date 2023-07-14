const express = require('express')
const router = express.Router()
const {basicAuth} = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')


const {
    createStore, getStores, getStore,
    updateStore, deleteStore, getStoreStaff,
    AddStoreDiscount, getStoreDiscounts,
    updateStoreDiscount, deleteStoreDiscount,
    increaseStoreProductPrice, addStoreAccount
} = require('../controllers/store.controller');

router.post('/', basicAuth, createStore);
router.get('/', getStores);
router.get('/:id', getStore);
router.put('/update/:id', basicAuth, uploadFile.single('file'), updateStore);
router.delete('/delete/:id', basicAuth, deleteStore);
router.get('/staff/:id', basicAuth, getStoreStaff);
router.post('/discount/add/:id', basicAuth, AddStoreDiscount);
router.get('/discount/:id', basicAuth, getStoreDiscounts);
router.put('/discount/update/:id', basicAuth, updateStoreDiscount);
router.delete('/discount/delete/:id', basicAuth, deleteStoreDiscount);
router.post('/increase/:id', basicAuth, increaseStoreProductPrice);
router.post('/account/add/:id', basicAuth, addStoreAccount);


module.exports = router