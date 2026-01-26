import { Worker, QueueEvents } from 'bullmq';
import { indexProjectJob } from './jobs/indexProjectJob';
import { memoryMaintenanceJob } from './jobs/memoryMaintenanceJob';
import { imageGenJob } from './jobs/imageGenJob';
import { TaskQueue } from './services/taskService';
import Redis from 'ioredis';
import { logger } from './utils/logger';

// Initialize Redis connection
const redisConnection = new Redis('redis://127.0.0.1:6379');

// Create workers for each queue
const indexingWorker = new Worker(TaskQueue.INDEXING, indexProjectJob, {
  connection: redisConnection,
  concurrency: 1, // Only one indexing job at a time
});

const memoryGardeningWorker = new Worker(TaskQueue.MEMORY_GARDENING, memoryMaintenanceJob, {
  connection: redisConnection,
  concurrency: 2, // Can run a couple of maintenance jobs
});

const imageGenWorker = new Worker(TaskQueue.IMAGE_GEN, imageGenJob, {
  connection: redisConnection,
  concurrency: 3, // Can handle multiple image generations
});

const defaultWorker = new Worker(TaskQueue.DEFAULT, async (job) => {
  logger.warn(`[DefaultWorker] Received job of type: ${job.data.type}. No handler defined.`);
  return { success: true, message: 'No handler for this job type' };
}, {
  connection: redisConnection,
  concurrency: 5,
});

// Set up queue events listeners
const indexingQueueEvents = new QueueEvents(TaskQueue.INDEXING, { connection: redisConnection });
const memoryGardeningQueueEvents = new QueueEvents(TaskQueue.MEMORY_GARDENING, { connection: redisConnection });
const imageGenQueueEvents = new QueueEvents(TaskQueue.IMAGE_GEN, { connection: redisConnection });
const defaultQueueEvents = new QueueEvents(TaskQueue.DEFAULT, { connection: redisConnection });

// Log job events
indexingQueueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Indexing job ${jobId} completed`);
});

indexingQueueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Indexing job ${jobId} failed:`, failedReason);
});

memoryGardeningQueueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Memory gardening job ${jobId} completed`);
});

memoryGardeningQueueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Memory gardening job ${jobId} failed:`, failedReason);
});

imageGenQueueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Image generation job ${jobId} completed`);
});

imageGenQueueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Image generation job ${jobId} failed:`, failedReason);
});

logger.info('[Worker] All workers initialized and listening...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Worker] SIGTERM received, shutting down workers...');
  
  await Promise.all([
    indexingWorker.close(),
    memoryGardeningWorker.close(),
    imageGenWorker.close(),
    defaultWorker.close(),
    indexingQueueEvents.close(),
    memoryGardeningQueueEvents.close(),
    imageGenQueueEvents.close(),
    defaultQueueEvents.close(),
    redisConnection.quit()
  ]);
  
  logger.info('[Worker] All workers shut down successfully');
});