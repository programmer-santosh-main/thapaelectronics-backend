import passport from "passport";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/userModel.js";

// Serialize user (required by passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* =========================
   GOOGLE STRATEGY
========================= */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const fullname = profile.displayName;
        const avatar = profile.photos?.[0]?.value;

        // 1️⃣ Check if Google already linked
        let user = await User.findOne({
          provider: "google",
          providerId: googleId,
        });

        if (user) return done(null, user);

        // 2️⃣ If not, try linking by email (old user)
        if (email) {
          user = await User.findOne({ email });

          if (user) {
            user.provider = "google";
            user.providerId = googleId;
            user.avatar = avatar;
            user.isVerified = true;
            await user.save();

            return done(null, user);
          }
        }

        // 3️⃣ Create new Google user
        user = await User.create({
          fullname,
          email,
          avatar,
          provider: "google",
          providerId: googleId,
          isVerified: true, // Google emails are verified
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

/* =========================
   FACEBOOK STRATEGY
========================= */
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/api/auth/facebook`,
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const facebookId = profile.id;
        const email = profile.emails?.[0]?.value;
        const fullname = profile.displayName;
        const avatar = profile.photos?.[0]?.value;

        // 1️⃣ Already linked
        let user = await User.findOne({
          provider: "facebook",
          providerId: facebookId,
        });

        if (user) return done(null, user);

        // 2️⃣ Link by email if exists
        if (email) {
          user = await User.findOne({ email });

          if (user) {
            user.provider = "facebook";
            user.providerId = facebookId;
            user.avatar = avatar;
            await user.save();

            return done(null, user);
          }
        }

        // 3️⃣ Create new Facebook user
        user = await User.create({
          fullname,
          email,
          avatar,
          provider: "facebook",
          providerId: facebookId,
          isVerified: !!email, // true only if email exists
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
