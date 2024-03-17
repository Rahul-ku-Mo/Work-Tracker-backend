const express = require("express");

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { authenticateToken } = require("../utils/validation");
const router = express.Router();

router
  .post("/signup", authController.signup)
  .post("/login", authController.login);

router.route("/").get(userController.getUsers);

router.use(authenticateToken);

router.route("/me").get(userController.getUser).patch(userController.updateUser);

module.exports = router;
