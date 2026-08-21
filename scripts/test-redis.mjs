import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("REDIS_URL is not set");
  process.exit(1);
}

const redis = new Redis(redisUrl);

async function testConnection() {
  try {
    console.log("Connecting to Redis...");
    await redis.set('test_key', 'Hello Smart LMS from Redis!');
    const value = await redis.get('test_key');
    console.log("Successfully connected and retrieved value:", value);
  } catch (error) {
    console.error("Redis connection failed:", error);
  } finally {
    redis.quit();
  }
}

testConnection();
