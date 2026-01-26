import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export class AtomicFileSystem {
  /**
   * Writes data to a file atomically by first writing to a temp file
   * and then renaming it. This prevents data corruption on crashes.
   */
  static async writeJson(filePath: string, data: any) {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
      await fs.rename(tempPath, filePath);
    } catch (error) {
      logger.error(`[AtomicFS] Failed to write JSON to ${filePath}`, error);
      try { await fs.unlink(tempPath); } catch (e) {} // Cleanup
      throw error;
    }
  }

  static async writeFile(filePath: string, content: string) {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content);
      await fs.rename(tempPath, filePath);
    } catch (error) {
      logger.error(`[AtomicFS] Failed to write file to ${filePath}`, error);
      try { await fs.unlink(tempPath); } catch (e) {} // Cleanup
      throw error;
    }
  }
}
