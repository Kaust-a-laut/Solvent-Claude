import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

export class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  getUploadDir() {
    return this.uploadDir;
  }

  async extractText(filePath: string, mimeType: string, originalName: string): Promise<string> {
    try {
      const ext = path.extname(originalName).toLowerCase();
      
      if (mimeType === 'application/pdf' || ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const { default: pdf } = await import('pdf-parse');
        const data = await (pdf as any)(dataBuffer);
        return data.text;
      } 
      
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }

      const codeExtensions = [
        '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', 
        '.css', '.html', '.py', '.java', '.c', '.cpp', '.h', 
        '.sql', '.yaml', '.yml', '.xml', '.env', '.gitignore', 
        '.ini', '.conf', '.sh', '.bat'
      ];
      
      if (codeExtensions.includes(ext) || mimeType.startsWith('text/')) {
        return await fs.readFile(filePath, 'utf-8');
      }

      return "";
    } catch (error) {
      console.error("[FileService] Text extraction failed:", error);
      return "";
    }
  }

  async listFiles() {
    try {
      await this.ensureUploadDir();
      const files = await fs.readdir(this.uploadDir);
      
      const fileInfos = await Promise.all(files.map(async (file) => {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime,
          url: `/files/${file}`
        };
      }));

      return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error("[FileService] Listing files failed:", error);
      throw error;
    }
  }

  async deleteFile(fileName: string) {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.unlink(filePath);
  }
}

export const fileService = new FileService();