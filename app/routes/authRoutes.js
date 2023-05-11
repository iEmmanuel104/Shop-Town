const express = require('express')
const router = express.Router()
const passport = require('passport')
const {basicAuth} = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')

const {
    SignUp,
    verifyEmail,
    profileOnboarding,
    forgotPassword,
    resetPassword,
    getloggedInUser,
    getNewAccessToken,
    signIn,
    resendVerificationCode,
    googleSignIn,
    facebookauth,
    logout,
    SwitchAccount,
    RegisterStore,
    selectStore


} = require('../controllers/auth.controller')

router.post('/signup', SignUp);
router.post('/verify', basicAuth, verifyEmail);
router.post('/resend', basicAuth, resendVerificationCode);
router.post('/signin', signIn);
router.post('/forgot', forgotPassword);
router.post('/reset', basicAuth, resetPassword);
router.post('/setlocation', basicAuth, profileOnboarding);
router.get('/user',basicAuth, getloggedInUser);
router.get('/refresh', getNewAccessToken);
router.post('/logout',basicAuth, logout);
router.post('/switch',basicAuth, SwitchAccount);
router.post('/registerstore',basicAuth, uploadFile.single('file') ,RegisterStore);
router.post('/selectstore',basicAuth, selectStore);

// Facebook authentication route
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), facebookauth);

// Google authentication route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/signin',
    session: false
}),googleSignIn);


module.exports = router