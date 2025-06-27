const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const awsController = require("../controllers/aws.controller");

// Apply auth middleware to all routes
router.use(auth);

router.post("/upload", awsController.uploadFile);
router.post("/confirm-upload", awsController.confirmUpload);

module.exports = router;
