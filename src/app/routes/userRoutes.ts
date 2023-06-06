import express, { Router } from 'express';
import userController from '../controllers/userController';
// import basicAuth from '../middlewares/authMiddleware';
import permit from '../middlewares/permission_handler';
import multer from '../middlewares/uploadmiddleware';

const { createUser,
    createBulkUser,
    updateUser,
    getUser,
    getUsers,
    addUserTenant,
    deleteUser,
    getUserProducts,
    getUserAssets,
    getUserArtists,
    getUserStats,
    getUserMonthly,
    downloadUserData
} = userController;

const router: Router = express.Router();

//  USER AUTH
router.post('/', createUser);
router.post('/bulk', createBulkUser);
router.route('/:id')
    .patch(multer.single('file'), updateUser)
    .get(getUser)
    .delete(deleteUser);
router.route('/:id/aut').put(addUserTenant);
router.route('/:id/products').get(getUserProducts);
router.route('/:id/assets').get(getUserAssets);
router.route('/:id/stats').get(getUserStats);
router.route('/:id/monthly').get(getUserMonthly);
router.route('/:id/artists').get(getUserArtists);
router.route('/').get(getUsers);
router.route('/:id/download/csv').get(downloadUserData);

export default router;
