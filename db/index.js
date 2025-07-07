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

// 1. Create a single PrismaClient instance with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling configuration
  __internal: {
    engine: {
      connectionString: process.env.DATABASE_URL,
    },
  },
});

// 2. Pre-warm the connection pool on startup
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// 3. Ensure proper cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  await client.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  await client.quit();
  process.exit(0);
});

client.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await client.connect();
  await connectDatabase(); // Pre-warm database connection
})();

module.exports = { prisma, PrismaClientKnownRequestError, client, connectDatabase };
