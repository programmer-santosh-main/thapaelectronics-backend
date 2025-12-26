import express from "express";
import passport from "passport";
import {
  oauthSuccessRedirect,
  oauthSuccessJson,
} from "../controllers/auth.oauth.controller.js";

const router = express.Router();

/* =========================
   GOOGLE AUTH
========================= */

// Start Google login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
    session: true, // keep true because we're using passport session
  }),
  oauthSuccessRedirect
);

/* =========================
   FACEBOOK AUTH
========================= */

// Start Facebook login
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// Facebook callback
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_failed`,
    session: true,
  }),
  oauthSuccessRedirect
);

/* =========================
   OPTIONAL JSON ENDPOINT
   (only if you want JSON response instead of redirect)
========================= */
router.get("/success", oauthSuccessJson);

export default router;
