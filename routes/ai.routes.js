const express = require("express");
const router = express.Router();

const aiController = require("../controllers/ai.controller");

router
  .post("/chat/new", aiController.createAIConversation)
  .post("/chat/stream", aiController.talkWithAI)
  .get("/chat/:conversationId/messages", aiController.getMessages)
  .get("/conversations", aiController.getConversations)
  .delete("/conversation/:conversationId", aiController.deleteConversation);

module.exports = router;
