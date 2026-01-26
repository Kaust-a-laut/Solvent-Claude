import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { vectorService } from './vectorService';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

const execPromise = promisify(exec);

export class ToolService {
  private rootDir: string;

  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../');
  }

  async executeTool(toolName: string, args: any) {
    console.log(`[ToolService] Executing ${toolName}...`, args);
    
    switch (toolName) {
      case 'read_file':
        return await this.readFile(args.path);
      case 'write_file':
        return await this.writeFile(args.path, args.content);
      case 'list_files':
        return await this.listFiles(args.path || '.');
      case 'run_shell':
        return await this.runShell(args.command);
      case 'web_search':
        return await this.webSearch(args.query);
      case 'fetch_web_content':
        return await this.fetchWebContent(args.url);
      case 'capture_ui':
        return await this.captureUI();
      case 'get_ui_text':
        return await this.getUIText();
      case 'resize_image':
        return await this.resizeImage(args.path, args.width, args.height);
      case 'crop_image':
        return await this.cropImage(args.path, args.left, args.top, args.width, args.height);
      case 'apply_image_filter':
        return await this.applyImageFilter(args.path, args.filter);
      case 'get_image_info':
        return await this.getImageInfo(args.path);
      case 'crystallize_memory':
        return await this.crystallizeMemory(args.content, args.type, args.tags);
      case 'invalidate_memory':
        return await this.invalidateMemory(args.memoryId, args.reason, args.replacementId);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async invalidateMemory(memoryId: string, reason: string, replacementId?: string) {
    const success = await vectorService.updateEntry(memoryId, {
      status: 'deprecated',
      deprecatedBy: replacementId,
      invalidationReason: reason
    });

    if (!success) {
      throw new Error(`Memory ID ${memoryId} not found.`);
    }

    // Append to notes for visibility
    const notesPath = path.join(this.rootDir, '.solvent_notes.md');
    const note = `\n### [MEMORY DEPRECATED] ${new Date().toLocaleDateString()}\n**ID:** ${memoryId}\n**Reason:** ${reason}\n${replacementId ? `**Superseded By:** ${replacementId}` : ''}\n---\n`;
    await fs.appendFile(notesPath, note).catch(() => {});

    return {
      status: 'success',
      message: `Memory ${memoryId} deprecated.`,
      reason
    };
  }

  private async crystallizeMemory(content: string, type: string, tags: string[] = []) {
    // 1. Persist to Vector Memory (Long-term semantic recall)
    await vectorService.addEntry(content, {
      type,
      tags,
      timestamp: new Date().toISOString(),
      crystallized: true
    });

    // 2. Append to Solvent Notes (Visible context bridge)
    const notesPath = path.join(this.rootDir, '.solvent_notes.md');
    const formattedEntry = `\n### [${type.toUpperCase()}] ${new Date().toLocaleDateString()}\n**Tags:** ${tags.join(', ')}\n\n${content}\n\n---\n`;
    
    try {
      await fs.appendFile(notesPath, formattedEntry);
    } catch (error) {
      // If file doesn't exist, create it
      await fs.writeFile(notesPath, `# Solvent Project Notes\n${formattedEntry}`);
    }

    // 3. Emit Event for UI Feedback
    const { supervisorService } = require('./supervisorService');
    supervisorService.emitEvent('MEMORY_CRYSTALLIZED', { type, content });

    return {
      status: 'success',
      message: `Memory crystallized as [${type}]. Saved to Vector DB and appended to .solvent_notes.md`,
      entry: { content, type, tags }
    };
  }

  private async getImageInfo(imagePath: string) {
    const fullPath = path.join(this.rootDir, imagePath);
    const metadata = await sharp(fullPath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      hasAlpha: metadata.hasAlpha
    };
  }

  private async resizeImage(imagePath: string, width?: number, height?: number) {
    const fullPath = path.join(this.rootDir, imagePath);
    const ext = path.extname(fullPath);
    const outputPath = fullPath.replace(ext, `_resized_${Date.now()}${ext}`);
    
    await sharp(fullPath)
      .resize(width, height)
      .toFile(outputPath);
    
    return {
      status: 'success',
      originalPath: imagePath,
      outputPath: path.relative(this.rootDir, outputPath),
      message: `Image resized to ${width || 'auto'}x${height || 'auto'}`
    };
  }

  private async cropImage(imagePath: string, left: number, top: number, width: number, height: number) {
    const fullPath = path.join(this.rootDir, imagePath);
    const ext = path.extname(fullPath);
    const outputPath = fullPath.replace(ext, `_cropped_${Date.now()}${ext}`);
    
    await sharp(fullPath)
      .extract({ left, top, width, height })
      .toFile(outputPath);
    
    return {
      status: 'success',
      originalPath: imagePath,
      outputPath: path.relative(this.rootDir, outputPath),
      message: `Image cropped to ${width}x${height} at ${left},${top}`
    };
  }

  private async applyImageFilter(imagePath: string, filter: 'grayscale' | 'sepia' | 'blur' | 'sharpen') {
    const fullPath = path.join(this.rootDir, imagePath);
    const ext = path.extname(fullPath);
    const outputPath = fullPath.replace(ext, `_filter_${filter}_${Date.now()}${ext}`);
    
    let transformer = sharp(fullPath);
    
    switch (filter) {
      case 'grayscale':
        transformer = transformer.grayscale();
        break;
      case 'blur':
        transformer = transformer.blur(5);
        break;
      case 'sharpen':
        transformer = transformer.sharpen();
        break;
      case 'sepia':
        // Sepia is typically done via color manipulation, sharp doesn't have a direct 'sepia' but we can use tint/recomb
        transformer = transformer.recomb([
          [0.393, 0.769, 0.189],
          [0.349, 0.686, 0.168],
          [0.272, 0.534, 0.131]
        ]);
        break;
    }
    
    await transformer.toFile(outputPath);
    
    return {
      status: 'success',
      originalPath: imagePath,
      outputPath: path.relative(this.rootDir, outputPath),
      message: `Applied ${filter} filter to image.`
    };
  }

  private async getUIText() {
    // In a real browser/electron context, this would scrape the DOM.
    // Here we simulate extracting the structural text of the active workspace.
    const projectStructure = await this.listFiles('.');
    return {
      active_workspace: "Solvent AI Agentic IDE",
      timestamp: new Date().toISOString(),
      structural_summary: projectStructure.map(f => `${f.type.toUpperCase()}: ${f.name}`).join('\n'),
      message: "Text-based UI structure extracted successfully."
    };
  }

  private async captureUI() {
    const uploadDir = path.join(this.rootDir, 'backend/uploads');
    
    // 1. Maintain Rolling Cache (Keep only last 3)
    try {
      const files = await fs.readdir(uploadDir);
      const captures = files
        .filter(f => f.startsWith('ui_capture_'))
        .map(f => ({ name: f, time: fs.stat(path.join(uploadDir, f)).then(s => s.mtimeMs) }));
      
      const resolvedCaptures = await Promise.all(captures.map(async c => ({ ...c, time: await c.time })));
      resolvedCaptures.sort((a, b) => b.time - a.time);

      if (resolvedCaptures.length >= 3) {
        const toDelete = resolvedCaptures.slice(2); // Keep current + 2 previous
        for (const file of toDelete) {
          await fs.unlink(path.join(uploadDir, file.name)).catch(() => {});
        }
      }
    } catch (e) {
      // If directory doesn't exist yet, it will be created below
    }

    const fileName = `ui_capture_${Date.now()}.png`;
    const filePath = path.join(uploadDir, fileName);
    await fs.mkdir(uploadDir, { recursive: true });
    
    await screenshot({ filename: filePath });
    const base64 = await fs.readFile(filePath, 'base64');
    
    return { 
      path: filePath, 
      base64: `data:image/png;base64,${base64}`,
      message: "UI state captured. Rolling cache maintained (last 3 kept)."
    };
  }

  private async webSearch(query: string) {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) throw new Error("SERPER_API_KEY not configured.");
    
    const response = await axios.post('https://google.serper.dev/search', { q: query }, {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  private async fetchWebContent(url: string) {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    // Return a slice of HTML to avoid token overflow, ideally we'd parse this to markdown
    return response.data.slice(0, 10000);
  }

  private async readFile(filePath: string) {
    const fullPath = path.join(this.rootDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    vectorService.addEntry(content.slice(0, 5000), { path: filePath, type: 'file_read' }).catch(console.error);
    return content;
  }

  private async writeFile(filePath: string, content: string) {
    const fullPath = path.join(this.rootDir, filePath);
    await fs.writeFile(fullPath, content);
    vectorService.addEntry(content.slice(0, 5000), { path: filePath, type: 'file_write' }).catch(console.error);
    return { status: 'success', path: filePath };
  }

  private async listFiles(dirPath: string) {
    const fullPath = path.join(this.rootDir, dirPath);
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    return files.map(f => ({
      name: f.name,
      type: f.isDirectory() ? 'directory' : 'file'
    }));
  }

  private async runShell(command: string) {
    // Safety check: Basic prevention of catastrophic commands
    const forbidden = ['rm -rf /', 'mkfs', 'dd'];
    if (forbidden.some(f => command.includes(f))) {
      throw new Error("Command rejected by security policy.");
    }
    const { stdout, stderr } = await execPromise(command, { cwd: this.rootDir });
    return { stdout, stderr };
  }
}

export const toolService = new ToolService();
