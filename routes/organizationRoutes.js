const express = require("express");

const organizationController = require("../controllers/organizationController");
const { authenticateToken } = require("../utils/validation");
const router = express.Router();

router.use(authenticateToken);

router.route("/").post(organizationController.createOrganization)
router.route("/members").get(organizationController.getOrganizationsByMember);
router.route("/leads").get(organizationController.getOrganizationsByLead);


router
  .route("/:organizationId")
  .get(organizationController.getOrganization)
  .patch(organizationController.assignMembersToOrganization);

module.exports = router;
