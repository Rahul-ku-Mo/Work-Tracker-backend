const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const awsController = require("../controllers/aws.controller");

// Apply auth middleware to all routes
router.use(auth);

router.post("/upload", awsController.uploadFile);
router.post("/confirm-upload", awsController.confirmUpload);

router.post("/upload-attachment", awsController.uploadAttachment);
router.post("/upload-attachment-confirm", awsController.confirmAttachmentUpload);
router.get("/attachments/:slug", awsController.getCardAttachments);
router.delete("/attachment/:attachmentId", awsController.deleteAttachment);

module.exports = router;
