import express from 'express';
import assetController from '../controllers/assetController';
const {
    getAssetInfo,
    getAssets,
    createAsset,
    updateAsset,
    assetArtists,
    getAssetStats,
    deleteAsset,
    setAssetDefaultSplit,
    createBulkAsset,
    setBulkSplits,
    downloadAssetData
} = assetController;

const router = express.Router();

router.route('/')
    .post(createAsset)
    .get(getAssets);

router.route('/bulk')
    .post(createBulkAsset);

router.route('/bulksplits')
    .post(setBulkSplits);

router.route('/:id')
    .put(updateAsset)
    .get(getAssetInfo)
    .delete(deleteAsset);

router.route('/:id/artists')
    .put(assetArtists);

router.route('/:id/stats')
    .get(getAssetStats);

router.route('/:id/setdefaultsplit')
    .put(setAssetDefaultSplit);

router.route('/:id/download/csv')
    .get(downloadAssetData);

export default router;
