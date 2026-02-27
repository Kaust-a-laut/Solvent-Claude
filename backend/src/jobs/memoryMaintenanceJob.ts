import { Job } from 'bullmq';
import { memoryConsolidationService } from '../services/memoryConsolidationService';
import { logger } from '../utils/logger';

export interface MemoryMaintenanceJobData {}

export async function memoryMaintenanceJob(job: Job<MemoryMaintenanceJobData>): Promise<any> {
  logger.info('[MemoryMaintenanceJob] Starting memory maintenance...');
  
  try {
    // Report initial progress
    await job.updateProgress(10);
    
    // Run the Amnesia Cycle (handles compression internally)
    await memoryConsolidationService.runAmnesiaCycle();
    
    // Report progress
    await job.updateProgress(70);
    
    // Run compression of older memories
    await memoryConsolidationService.compressOlderMemories();
    
    // Report completion
    await job.updateProgress(100);
    
    logger.info('[MemoryMaintenanceJob] Completed memory maintenance');
    
    return {
      success: true,
      message: 'Memory maintenance completed successfully',
      completedAt: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('[MemoryMaintenanceJob] Failed memory maintenance', error);
    
    // Throw error to mark job as failed
    throw new Error(`Memory maintenance failed: ${error.message}`);
  }
}