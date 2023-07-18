const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../../models');
const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, API_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = require('./configs');

module.exports = (passport) => {
    passport.use(
        new FacebookStrategy(
            {
                clientID: FACEBOOK_APP_ID,
                clientSecret: FACEBOOK_APP_SECRET,
                callbackURL: `${API_URL}/auth/facebook/callback`,
                profileFields: ['id', 'email', 'name', 'picture.type(large)', 'displayName'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const { id: facebookId, email, name, picture, displayName } = profile._json;

                    console.log('profile', profile);

                    let user = await User.findOne({ where: { facebookId } });

                    if (!user) {
                        user = await User.create({
                            email,
                            facebookId,
                            firstName: name.split(' ')[0],
                            lastName: name.split(' ')[1],
                            isVerified: true,
                            terms: 'on',
                        });
                    }

                    return done(null, user);
                } catch (error) {
                    console.log(error);
                    return done(error);
                }
            },
        ),
    );

    // google auth
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: '/auth/google/callback',
            },
            (accessToken, refreshToken, profile, done) => {
                // Find or create the user in the database
                User.findOrCreate({
                    where: { googleId: profile.id },
                    defaults: {
                        email: profile.emails[0].value,
                        firstName: profile.name.givenName,
                        lastName: profile.name.familyName,
                        googleId: profile.id,
                        isActivated: true,
                        terms: 'on',
                    },
                })
                    .then(([user, created]) => {
                        // If the user is created, log them in
                        if (created) {
                            console.log('User successfully created:', user.email);
                            return done(null, user);
                        }

                        // Otherwise, log in the found user
                        console.log('User already exists:', user.email);
                        return done(null, user);
                    })

                    // If there's an error, log it and return
                    .catch((error) => done(error));
            },
        ),
    );

    passport.serializeUser((user, done) => {
        console.log(`\n ----------> Serialize User:`);
        console.log(user);
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        console.log(`\n ----------> Deserialize User:`);
        console.log(user);
        done(null, user);
    });
};
