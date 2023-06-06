import express, { Router } from 'express';
import multer from 'multer';
import { uploadRoyalty, getFiles, processFile, fileStatus, createRoyaltyFile } from '../controllers/fileController';
import { RequestHandler } from 'express-serve-static-core';

const router: Router = express.Router();
const uploadMiddleware: RequestHandler = multer().single('file');

router.route('/royalty').post(uploadMiddleware, uploadRoyalty);

router.put('/royalty/decompress/:tenant/:id', processFile);
router.get('/royalty/:id', fileStatus);

router.get('/:type', getFiles);

router.post('/createroyalty', createRoyaltyFile);

export = router;
