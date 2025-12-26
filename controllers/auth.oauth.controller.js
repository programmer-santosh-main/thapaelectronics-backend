import jwt from "jsonwebtoken";

/**
 * Generate JWT token same style as your normal login system.
 * If your existing token payload is different, edit ONLY the payload part below.
 */
const generateAuthToken = (user) => {
  // Most common pattern: store user id in token
  return jwt.sign(
    { id: user._id }, // ✅ keep it consistent with your existing middleware
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Redirect to frontend with token
 * Example: https://your-frontend.com/oauth-success?token=xxxxx
 */
export const oauthSuccessRedirect = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    const token = generateAuthToken(req.user);

    // You can choose any route you want in frontend
    // Make sure frontend reads token from query and saves to localStorage
    const redirectUrl = `${process.env.FRONTEND_URL}/oauth-success?token=${token}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("OAuth Success Redirect Error:", err);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

/**
 * Optional: If you want a JSON response instead of redirect.
 * (useful for mobile apps or popup based auth)
 */
export const oauthSuccessJson = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "OAuth failed" });

    const token = generateAuthToken(req.user);

    return res.status(200).json({
      message: "OAuth login success",
      token,
      user: {
        id: req.user._id,
        fullname: req.user.fullname,
        email: req.user.email,
        avatar: req.user.avatar,
        provider: req.user.provider,
      },
    });
  } catch (err) {
    console.error("OAuth Success JSON Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
