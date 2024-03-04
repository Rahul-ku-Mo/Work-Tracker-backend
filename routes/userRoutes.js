const express = require("express");

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
//
const router = express.Router();

router
  .post("/signup", authController.signup)
  .post("/login", authController.login);

//router.use(authenticateToken);

router.route("/").get(userController.getUsers);

router.route("/:userId").get(userController.getUser);

module.exports = router;
