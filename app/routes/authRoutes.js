const express = require('express')
const router = express.Router()
const passport = require('passport')

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
    // googleCallback,
    // googleSignIn,
    facebookauth


} = require('../controllers/auth.controller')

// // Use the req.isAuthenticated() function to check if user is Authenticated
// const checkAuthenticated = (req, res, next) => {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.redirect('/login');
// };

router.post('/signup', SignUp);
router.post('/verify', verifyEmail);
router.post('/resend', resendVerificationCode);
router.post('/signin', signIn);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);
router.post('/profile', profileOnboarding);
router.get('/user', getloggedInUser);
router.post('/refresh', getNewAccessToken);
// router.post('/google/callback', googleCallback);
// router.post('/google/signin', googleSignIn);

// Facebook authentication route
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), facebookauth);

// Google authentication route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
}));
 

module.exports = router