const dotenv = require('dotenv');
// Load environment variables from .env file
dotenv.config({path:'backend/config/config.env'})
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {User} = require('../models/userModel'); // Adjust the path according to your User model




passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // User found, log them in
        return done(null, user);
      } else {
        // Check if a user with the same email exists
        const existingUser = await User.findOne({ email: profile.emails[0].value });
        if (existingUser) {
          // If email matches, update the existing user with Google ID
          existingUser.googleId = profile.id;
          user = await existingUser.save();
          return done(null, user);
        } else {
          // Create a new user
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            isVerified:true
        
          });
          user = await newUser.save();
          return done(null, user);
        }
      }
    } catch (error) {
      done(error, false);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

module.exports = passport;
