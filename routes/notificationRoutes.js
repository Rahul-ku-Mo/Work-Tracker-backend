const express = require("express");

const notificationController = require("../controllers/notificationController");
const router = express.Router();

router.route("/").get(notificationController.getNotifications);

router.route("/invite").post(notificationController.createInviteNotification);

router.route("/:notificationId/read").patch(notificationController.markNotificationAsRead);

router.route("/mark-all-read").patch(notificationController.markAllNotificationsAsRead);

module.exports = router;
