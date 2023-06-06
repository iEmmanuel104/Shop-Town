import express, { Router } from 'express';
import artistController from '../controllers/artistController';
const { createArtist, updateArtist, getArtist, getArtists, 
    deleteArtist, getArtistProducts, getArtistAssets, getArtistStats, 
    bulkSetArtistSplit, createBulkArtist, downloadArtistData } = artistController;
const router: Router = express.Router();

router.route('/').post(createArtist).get(getArtists);
router.route('/bulksplit').post(bulkSetArtistSplit);
router.route('/bulk').post(createBulkArtist);
router.route('/:id')
    .put(updateArtist)
    .get(getArtist)
    .delete(deleteArtist);

router.route('/:id/products').get(getArtistProducts);
router.route('/:id/assets').get(getArtistAssets);

router.route('/:id/stats').get(getArtistStats);
router.route('/:id/download/csv').get(downloadArtistData);

export default router;
