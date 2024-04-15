const express = require("express");

const notificationController = require("../controllers/notificationController");
const { authenticateToken } = require("../utils/validation");
const router = express.Router();

router.use(authenticateToken);

router.route("/").get(notificationController.getNotifications);

router.route("/invite").post(notificationController.createInviteNotification);


module.exports = router;
