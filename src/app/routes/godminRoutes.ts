import express from 'express';
import goadminController from '../controllers/godminController';
const { getTenants, getProducts, getAssets, getArtists, getUsers, getSplits, getFiles } = goadminController;
// import File from '../controllers/fileController';
// const { processFile } = File;
const router = express.Router();

// router.put('/file/royalty/decompress/:tenant/:id', processFile);

router.get('/tenant', getTenants);
router.get('/artist', getArtists);
router.get('/user', getUsers);
router.get('/asset', getAssets);
router.get('/product', getProducts);
router.get('/split', getSplits);
router.get('/file', getFiles);

export default router;
