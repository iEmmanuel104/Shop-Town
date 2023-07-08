const express = require('express')
const router = express.Router()
const passport = require('passport')
const {basicAuth} = require('../middlewares/authWares')
const uploadFile = require('../middlewares/multerobject')

const {
    signUp,
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
    switchAccount,
    registerStore,
    selectStore


} = require('../controllers/auth.controller')

router.post('/signup', signUp);
router.post('/verify', basicAuth, verifyEmail);
router.post('/resend', basicAuth, resendVerificationCode);
router.post('/signin', signIn);
router.post('/forgot', forgotPassword);
router.post('/reset', basicAuth, resetPassword);
router.post('/setlocation', basicAuth, profileOnboarding);
router.get('/user',basicAuth, getloggedInUser);
router.get('/refresh', getNewAccessToken);
router.post('/logout',basicAuth, logout);
router.post('/switch',basicAuth, switchAccount);
router.post('/registerstore', basicAuth, uploadFile.single('file') ,registerStore);
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