const express = require("express");

const organizationController = require("../controllers/organizationController");
const { authenticateToken } = require("../utils/validation");
const router = express.Router();

router.use(authenticateToken);

router.route("/").post(organizationController.createOrganization);

router
  .route("/:organizationId")
  .patch(organizationController.assignMembersToOrganization);

module.exports = router;
