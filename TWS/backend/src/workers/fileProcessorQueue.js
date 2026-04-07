const { Queue } = require('bullmq');
const Redis = require('ioredis');

let redis = null;
let fileProcessorQueue = null;
let redisErrorLogged = false;

// Check if Redis is disabled via environment variable
if (process.env.REDIS_DISABLED === 'true') {
  console.log('ℹ️  Redis disabled via REDIS_DISABLED=true - File processing queue disabled');
} else {
  // Redis connection with graceful error handling
  try {
    redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    }
  });

  // Handle Redis connection errors gracefully — never let these crash the server
  redis.on('error', (error) => {
    if (!redisErrorLogged) {
      console.warn('⚠️  Redis not available - File processing queue disabled');
      redisErrorLogged = true;
    }
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected - File processing queue enabled');
    redisErrorLogged = false;
  });

  // Create file processor queue only if Redis is available
  fileProcessorQueue = new Queue('fileProcessor', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,      // Keep last 50 failed jobs
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });

  // Queue events for monitoring
  fileProcessorQueue.on('error', (error) => {
    // Only log connection errors once
    if (error.code === 'ECONNREFUSED' && !redisErrorLogged) {
      redisErrorLogged = true;
      return; // Suppress repeated connection errors
    }
    console.error('File processor queue error:', error.message);
  });
  } catch (error) {
    console.warn('⚠️  Failed to initialize file processor queue:', error.message);
    redis = null;
    fileProcessorQueue = null;
  }
}

// Only attach event listeners if queue is available
if (fileProcessorQueue) {
  fileProcessorQueue.on('waiting', (job) => {
    console.log(`Job ${job.id} is waiting`);
  });

  fileProcessorQueue.on('active', (job) => {
    console.log(`Job ${job.id} is now active`);
  });

  fileProcessorQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with result:`, result);
  });

  fileProcessorQueue.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed:`, error);
  });
}

// Export queue or a no-op fallback
module.exports = fileProcessorQueue || {
  add: async () => {
    console.warn('⚠️  File processor queue not available (Redis not connected)');
    return null;
  },
  getJob: async () => null,
  getJobs: async () => [],
  close: async () => {}
};
