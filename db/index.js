const {
  PrismaClient,
  PrismaClientKnownRequestError,
} = require("@prisma/client");

const { createClient } = require("redis");

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// 1.Create a new PrismaClient instance
const prisma = new PrismaClient();

const client = redisClient.connect();

module.exports = { prisma, PrismaClientKnownRequestError, redisClient, client };
