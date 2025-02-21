const express = require("express");

const notificationController = require("../controllers/notificationController");
const router = express.Router();

router.route("/").get(notificationController.getNotifications);

router.route("/invite").post(notificationController.createInviteNotification);

module.exports = router;
