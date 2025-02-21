const { GoogleGenerativeAI } = require("@google/generative-ai");

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = gemini.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "Your name is EazyAI. You would start greeting the user with a message and then continue with the conversation.You are a helpful assistant that can answer questions and help with tasks.",
});

module.exports = {
  model,
};
