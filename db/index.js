const {
  PrismaClient,
  PrismaClientKnownRequestError,
} = require("@prisma/client");

const { createClient } = require("redis");

const client = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// 1.Create a new PrismaClient instance
const prisma = new PrismaClient();

client.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();

module.exports = { prisma, PrismaClientKnownRequestError, client };
