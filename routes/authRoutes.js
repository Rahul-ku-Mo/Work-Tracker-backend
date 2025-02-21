const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router
  .post("/signup", authController.signup)
  .post("/login", authController.login)
  .post("/oauth2/google", authController.oauthGoogleLogin)
  .get("/auth/verify", authController.verifyTokenAndRole);
// .get("/oauth2/google/callback", authController.googleLoginCallback);

module.exports = router;
