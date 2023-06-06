import express from 'express';
import { Request, Response } from 'express';
import { getRoyaltySummary, getRoyaltyMonth, getRoyaltyDSP, getRoyaltyCountry, getRoyaltyProduct, getRoyaltyAsset, getRoyaltyArtist, getRoyaltyAccountingPeriod, getRoyaltySaleType, getRoyaltyAggregator } from '../controllers/royaltyController';

const router = express.Router();

router.get('/', getRoyaltySummary);
router.get('/month', getRoyaltyMonth);
router.get('/dsp', getRoyaltyDSP);
router.get('/saletype', getRoyaltySaleType);
router.get('/aggregator', getRoyaltyAggregator);
router.get('/country', getRoyaltyCountry);
router.get('/product', getRoyaltyProduct);
router.get('/asset', getRoyaltyAsset);
router.get('/artist', getRoyaltyArtist);
router.get('/accountingperiod', getRoyaltyAccountingPeriod);

export default router;
