import express from 'express';
import productController from '../controllers/productController';

const {
    createProduct,
    createBulkProduct,
    deleteProduct,
    getProductInfo,
    getProductStats,
    getProducts,
    productArtists,
    productAssets,
    setBulkSplits,
    setProductDefaultSplit,
    updateProduct,
    downloadProductData,
} = productController;

const router = express.Router();

router.route('/').post(createProduct).get(getProducts);

router.route('/:id').put(updateProduct).get(getProductInfo).delete(deleteProduct);

router.route('/bulk').post(createBulkProduct);

router.route('/bulksplits').post(setBulkSplits);

router.route('/:id/assets').put(productAssets);

router.route('/:id/artists').put(productArtists);

router.route('/:id/setdefaultsplit').put(setProductDefaultSplit);

router.route('/:id/stats').get(getProductStats);

router.route('/:id/download/csv').get(downloadProductData);

export default router;
