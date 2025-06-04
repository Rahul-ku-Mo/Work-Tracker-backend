const { prisma } = require("../db");
const { model } = require("../services/gemini.service");

const createAIConversation = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversation = await prisma.aiConversation.create({
      data: {
        title: "New Conversation",
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: conversation,
      message: "Conversation created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const talkWithAI = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Find existing or create new conversation
    let chat = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: true,
      },
    });

    // Validate chat exists
    if (!chat) {
      throw new Error("Conversation not found");
    }

    // Create user message and connect to existing conversation
    await prisma.aiConversationMessage.create({
      data: {
        role: "user",
        content: message,
        aiConversation: {
          connect: {
            id: chat.id,
          },
        },
      },
    });

    // Get conversation history
    const history = chat.messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    // Add current message to history
    history.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Start chat with model
    const aiChat = model.startChat({ history });
    let result = await aiChat.sendMessageStream(message);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      
      // Send chunk to client
      res.write(
        `data: ${JSON.stringify({
          chunk: chunkText,
        })}\n\n`
      );
    }

    // Save model response
    await prisma.aiConversationMessage.create({
      data: {
        content: fullResponse,
        role: "model",
        aiConversationId: chat.id,
      },
    });

    // Update conversation title if it doesn't exist
    if (chat.title === "New Conversation") {
      try {
        await prisma.aiConversation.update({
          where: { 
            id: chat.id 
          },
          data: {
            title: fullResponse.slice(0, 50) + "..."  // Increased to 50 chars for better context
          },
        });
      } catch (titleError) {
        console.error("Failed to update conversation title:", titleError);
        // Continue execution even if title update fails
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.write(`data: ${JSON.stringify({ 
      error: error.message || "An error occurred during the conversation" 
    })}\n\n`);
    res.end();
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await prisma.aiConversationMessage.findMany({
      where: { aiConversationId: conversationId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      status: "success",
      data: messages,
      message: "Messages fetched successfully",
      messageCount: messages.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: conversations,
      message: "Conversations fetched successfully",
      messageCount: conversations.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await prisma.aiConversation.delete({
      where: { id: conversationId },
    });

    res.status(204).json({
      status: "success",
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const improveWriting = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: "Text content is required for improvement"
      });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    const prompt = `Please improve the following text by making it clearer, more professional, and better structured while maintaining the original meaning and tone. Only return the improved text without any explanations or additional comments:

"${text}"`;

    try {
      const result = await model.generateContentStream(prompt);
      let fullResponse = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Send chunk to client
        res.write(
          `data: ${JSON.stringify({
            chunk: chunkText,
            type: "content"
          })}\n\n`
        );
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({ 
        done: true, 
        fullText: fullResponse,
        type: "complete" 
      })}\n\n`);
      res.end();

    } catch (modelError) {
      console.error("Gemini model error:", modelError);
      res.write(`data: ${JSON.stringify({ 
        error: "Failed to improve text. Please try again.",
        type: "error"
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error("Improve Writing Error:", error);
    
    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: error.message || "An error occurred while improving the text" 
      });
    }
    
    // If we're in streaming mode, send error as SSE
    res.write(`data: ${JSON.stringify({ 
      error: error.message || "An error occurred while improving the text",
      type: "error"
    })}\n\n`);
    res.end();
  }
};

module.exports = {
  talkWithAI,
  getMessages,
  getConversations,
  createAIConversation,
  deleteConversation,
  improveWriting,
};
