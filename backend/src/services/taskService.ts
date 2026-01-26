import { Queue, Worker, Job, QueueEvents, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export enum TaskQueue {
  DEFAULT = 'default',
  INDEXING = 'indexing',
  MEMORY_GARDENING = 'memory_gardening',
  IMAGE_GEN = 'image_gen'
}

export interface TaskPayload {
  type: string;
  data: any;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class TaskService {
  private redis: Redis;
  private queues: Map<TaskQueue, Queue> = new Map();
  private workers: Map<TaskQueue, Worker> = new Map();
  private queueEvents: Map<TaskQueue, QueueEvents> = new Map();

  constructor(redisUrl: string = 'redis://127.0.0.1:6379') {
    this.redis = new Redis(redisUrl);
    
    // Initialize all queues
    Object.values(TaskQueue).forEach(queueName => {
      this.queues.set(queueName, new Queue(queueName, { 
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: {
            age: 24 * 3600, // Keep failed jobs for 24 hours
          },
        }
      }));
    });
  }

  getQueue(queueName: TaskQueue): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  async dispatchJob(queueName: TaskQueue, jobName: string, payload: TaskPayload, opts?: any): Promise<string> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, payload, opts);
    logger.info(`[TaskService] Dispatched job ${jobName} to queue ${queueName} with ID ${job.id}`);
    return job.id!;
  }

  async dispatchIndexingJob(projectPath: string, opts?: any): Promise<string> {
    return this.dispatchJob(
      TaskQueue.INDEXING,
      'index-project',
      { type: 'index-project', data: { projectPath } },
      opts
    );
  }

  async dispatchMemoryMaintenanceJob(opts?: any): Promise<string> {
    return this.dispatchJob(
      TaskQueue.MEMORY_GARDENING,
      'memory-maintenance',
      { type: 'memory-maintenance', data: {} },
      opts
    );
  }

  async dispatchImageGenerationJob(prompt: string, model?: string, opts?: any): Promise<string> {
    return this.dispatchJob(
      TaskQueue.IMAGE_GEN,
      'image-generation',
      { type: 'image-generation', data: { prompt, model } },
      opts
    );
  }

  async getJobStatus(jobId: string): Promise<{ status: string; progress: number; result?: any; error?: string }> {
    // Look for the job in all queues
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        let status = 'unknown';
        let progress = 0;
        
        if (job.active) {
          status = 'active';
          progress = job.progress || 0;
        } else if (job.completed) {
          status = 'completed';
          progress = 100;
        } else if (job.failed) {
          status = 'failed';
          progress = 100;
        } else if (job.delayed) {
          status = 'delayed';
        } else if (job.waiting) {
          status = 'waiting';
        } else if (job.paused) {
          status = 'paused';
        }
        
        let result = undefined;
        let error = undefined;
        
        if (status === 'completed') {
          result = job.returnvalue;
        } else if (status === 'failed') {
          error = job.failedReason;
        }
        
        return {
          status,
          progress,
          result,
          error
        };
      }
    }
    
    // If job wasn't found in any queue, it might have been processed and removed
    // In this case, we can't determine its status anymore
    return {
      status: 'unknown',
      progress: 0
    };
  }

  async scheduleMaintenance(opts?: any): Promise<string> {
    // Schedule a maintenance job with a delay to avoid immediate execution
    return this.dispatchJob(
      TaskQueue.MEMORY_GARDENING,
      'scheduled-maintenance',
      { type: 'scheduled-maintenance', data: {} },
      { 
        ...opts,
        delay: 5000 // 5 seconds delay by default
      }
    );
  }

  async close(): Promise<void> {
    logger.info('[TaskService] Closing all workers and connections...');
    
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    
    // Close all queue events
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }
    
    // Disconnect from Redis
    await this.redis.quit();
    
    logger.info('[TaskService] All connections closed.');
  }
}

// Export singleton instance
export const taskService = new TaskService();