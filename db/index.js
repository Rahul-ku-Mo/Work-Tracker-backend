const {
  PrismaClient,
  PrismaClientKnownRequestError,
} = require("@prisma/client");

const { createClient } = require("redis");

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV === "development";

const client = createClient(
  isDevelopment
    ? {
        host: "localhost",
        port: 6379,
      }
    : {
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
        },
      }
);

client.on("error", (err) => console.log("Redis Client Error", err));


(async () => {
  try {
    await client.connect();
    console.log("Connected to Redis successfully");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

module.exports = { prisma, PrismaClientKnownRequestError, client };
