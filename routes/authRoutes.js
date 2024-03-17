const express = require("express");

const authController = require("../controllers/authController");

const router = express.Router();

router
  .post("/signup", authController.signup)
  .post("/login", authController.login)
  .get("/oauth2/google", authController.oauthGoogleLogin)
  .get("/oauth2/google/callback", authController.googleLoginCallback);

module.exports = router;
