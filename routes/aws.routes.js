const express = require("express");
const router = express.Router();

const awsController = require("../controllers/aws.controller");

router.post("/upload", awsController.uploadFile);

module.exports = router;
