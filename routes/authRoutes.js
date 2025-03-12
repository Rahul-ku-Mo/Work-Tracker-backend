const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

router
  .post("/signup", authController.signup)
  .post("/login", authController.login)
  .post("/auth/google", authController.oauthGoogleLogin)
  .get("/auth/verify", authController.verifyTokenAndRole);
// .get("/oauth2/google/callback", authController.googleLoginCallback);

module.exports = router;
