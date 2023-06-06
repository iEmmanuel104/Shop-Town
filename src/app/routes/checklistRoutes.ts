import express from 'express';
const router = express.Router();
import authmiddlewares from '../middlewares/authMiddleware';


import { checkRoyaltyAsset, checkRoyaltyProduct, checkAssetSplits, checkProductSplits, checkAllSplits, checkMissingRoyaltySplits  } from '../controllers/checklistController';

router.get('/royaltyassets', checkRoyaltyAsset);
router.get('/royaltyproducts', checkRoyaltyProduct);
router.get('/assetsplits', checkAssetSplits);
router.get('/productsplits', checkProductSplits);
router.get('/allsplits', checkAllSplits);
router.get('/missingroyaltysplits', checkMissingRoyaltySplits);

export default router;
