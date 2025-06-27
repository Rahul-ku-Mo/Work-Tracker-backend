const express = require("express");

const authController = require("../controllers/auth.controller");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");
const router = express.Router();

router
  .post("/signup", authController.signup)
  .post("/login", authController.login);

router.use(authenticateToken);

router.route("/").get(userController.getUsers);

router.route("/me").get(userController.getUser).patch(userController.updateUser);

module.exports = router;
