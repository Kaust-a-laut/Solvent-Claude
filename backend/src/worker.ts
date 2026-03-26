import { Worker, QueueEvents, Processor } from 'bullmq';
import { indexProjectJob } from './jobs/indexProjectJob';
import { memoryMaintenanceJob } from './jobs/memoryMaintenanceJob';
import { imageGenJob } from './jobs/imageGenJob';
import { orchestrationJob } from './jobs/orchestrationJob';
import { TaskQueue } from './services/taskService';
import Redis from 'ioredis';
import { logger } from './utils/logger';
import { pluginManager } from './services/pluginManager';

// Initialize Redis connection
const redisConnection = new Redis('redis://127.0.0.1:6379');

// Initialize the plugin manager
pluginManager.initialize()
  .then(() => {
    logger.info('[Worker] Plugin system initialized successfully');
  })
  .catch((error) => {
    logger.error('[Worker] Failed to initialize plugin system:', error);
  });

// --- Lazy Worker Activation ---
// Workers are not created until the first job arrives, then idle after 60s of inactivity.

const IDLE_TIMEOUT_MS = 60_000;

interface LazyWorkerHandle {
  worker: Worker | null;
  queueEvents: QueueEvents;
  idleTimer: ReturnType<typeof setTimeout> | null;
  queue: string;
}

const lazyHandles: LazyWorkerHandle[] = [];

function createLazyWorker(
  queue: string,
  processor: Processor,
  opts: { concurrency: number }
): LazyWorkerHandle {
  const queueEvents = new QueueEvents(queue, { connection: redisConnection });
  const handle: LazyWorkerHandle = {
    worker: null,
    queueEvents,
    idleTimer: null,
    queue,
  };

  const ensureWorker = () => {
    // Clear any pending idle shutdown
    if (handle.idleTimer) {
      clearTimeout(handle.idleTimer);
      handle.idleTimer = null;
    }

    if (!handle.worker) {
      logger.info(`[LazyWorker] Activating worker for queue "${queue}"`);
      handle.worker = new Worker(queue, processor, {
        connection: redisConnection,
        concurrency: opts.concurrency,
      });

      handle.worker.on('completed', () => {
        scheduleIdle();
      });

      handle.worker.on('failed', () => {
        scheduleIdle();
      });
    }
  };

  const scheduleIdle = () => {
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    handle.idleTimer = setTimeout(async () => {
      if (handle.worker) {
        logger.info(`[LazyWorker] Idling worker for queue "${queue}" after ${IDLE_TIMEOUT_MS / 1000}s inactivity`);
        await handle.worker.close();
        handle.worker = null;
      }
    }, IDLE_TIMEOUT_MS);
  };

  // Listen for waiting jobs to activate the worker on demand
  queueEvents.on('waiting', () => {
    ensureWorker();
  });

  lazyHandles.push(handle);
  return handle;
}

// Create lazy workers for each queue
const indexingHandle = createLazyWorker(TaskQueue.INDEXING, indexProjectJob, {
  concurrency: 1, // Only one indexing job at a time
});

const memoryGardeningHandle = createLazyWorker(TaskQueue.MEMORY_GARDENING, memoryMaintenanceJob, {
  concurrency: 2, // Can run a couple of maintenance jobs
});

const imageGenHandle = createLazyWorker(TaskQueue.IMAGE_GEN, imageGenJob, {
  concurrency: 3, // Can handle multiple image generations
});

const orchestrationHandle = createLazyWorker(TaskQueue.ORCHESTRATION, orchestrationJob, {
  concurrency: 2, // Each mission involves multiple LLM calls
});

const defaultHandle = createLazyWorker(TaskQueue.DEFAULT, async (job) => {
  logger.warn(`[DefaultWorker] Received job of type: ${job.data.type}. No handler defined.`);
  return { success: true, message: 'No handler for this job type' };
}, {
  concurrency: 5,
});

// Log job events via queue events (these are always active)
indexingHandle.queueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Indexing job ${jobId} completed`);
});

indexingHandle.queueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Indexing job ${jobId} failed:`, failedReason);
});

memoryGardeningHandle.queueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Memory gardening job ${jobId} completed`);
});

memoryGardeningHandle.queueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Memory gardening job ${jobId} failed:`, failedReason);
});

imageGenHandle.queueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Image generation job ${jobId} completed`);
});

imageGenHandle.queueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Image generation job ${jobId} failed:`, failedReason);
});

orchestrationHandle.queueEvents.on('completed', (jobId) => {
  logger.info(`[Worker] Orchestration job ${jobId} completed`);
});

orchestrationHandle.queueEvents.on('failed', (jobId, failedReason) => {
  logger.error(`[Worker] Orchestration job ${jobId} failed:`, failedReason);
});

logger.info('[Worker] Lazy workers registered and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Worker] SIGTERM received, shutting down workers...');

  const closePromises: Promise<void>[] = [];
  for (const handle of lazyHandles) {
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    if (handle.worker) closePromises.push(handle.worker.close());
    closePromises.push(handle.queueEvents.close());
  }
  closePromises.push(redisConnection.quit().then(() => {}));

  await Promise.all(closePromises);

  logger.info('[Worker] All workers shut down successfully');
});
