import express from 'express'
import { Router } from 'express'
const router: Router = express.Router()
import multer from '../middlewares/uploadmiddleware';
import auth from '../controllers/auth'

const {
    signup,
    passwordReset,
    verifyEmail,
    setPassword,
    importdata,
    login,
    logout,
    getLoggedInUser,
  /* googleSignin, */ forgotPassword,
    inviteUser,
    activateAccountInvite,
    resendInvite,
    // registerLabelAccount,

    // superAdminSignup,
    // activateSuperAdmin,
} = auth

import authmiddlewares from '../middlewares/authMiddleware'
const { basicAuth } = authmiddlewares
import permit from '../middlewares/permission_handler';

router
    .post('/signup', signup)
    .post('/verify', verifyEmail)
    .post('/setpassword', setPassword)
    .post('/importdata',basicAuth, multer.single('file'), importdata)
    .post('/login', login) 
    // .post('/login', basicAuth, permit(), login)
    //   .post('/googlesignin', googleSignin)
    .post('/forgotpassword', forgotPassword)
    .patch('/resetpassword', passwordReset)
    .post('/logout', logout)
    .get('/', getLoggedInUser)
    .get('/authtoken', basicAuth)
    .post( '/select/tenant', basicAuth)
    .post('/invite', basicAuth, inviteUser)
    .post('/activate', activateAccountInvite)
    .post('/resend', basicAuth, resendInvite)
    // .post('/registerlabel', registerLabelAccount)
    // .post('/signup/superadmin', superAdminSignup)
    // .post('/activate/superadmin', basicAuth, activateSuperAdmin)

// Permissison route handler
import permission from '../controllers/permission'
const {
    addManualRestriction,
    removeManualRestriction,
    getManualPermissionsForUser,
    updateUsersRole,
    addManualPermission,
    removeManualPermission,
    getManualRestrictionsForUser,
} = permission
router.use(basicAuth, permit())
router
    .post('/permission', addManualPermission)
    .delete('/permission', removeManualPermission)
    .get('/permission', getManualPermissionsForUser)
    .post('/restriction', addManualRestriction)
    .delete('/restriction', removeManualRestriction)
    .get('/restriction', getManualRestrictionsForUser)
    .patch('/role', updateUsersRole)
    
export = router
