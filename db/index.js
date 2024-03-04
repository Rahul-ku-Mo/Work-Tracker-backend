const {
    PrismaClient,
    PrismaClientKnownRequestError,
} = require('@prisma/client');

// 1.Create a new PrismaClient instance
const prisma = new PrismaClient();

module.exports = { prisma, PrismaClientKnownRequestError };
