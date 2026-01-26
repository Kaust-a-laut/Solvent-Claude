import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const router = Router();
// Allow dynamic project root, but default to a dedicated 'projects' or empty directory
const rootDir = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../');
const isInternalDev = process.env.SOLVENT_INTERNAL_DEV === 'true';

// If not in internal dev and no PROJECT_ROOT is set, we could restrict access or point to an empty uploads folder
const finalRootDir = (isInternalDev || process.env.PROJECT_ROOT) 
  ? rootDir 
  : path.resolve(__dirname, '../../uploads');

// Multer configuration
const uploadDir = path.resolve(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();
    let content = '';

    // Extract text content based on file type
    if (extension === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (['.docx', '.doc'].includes(extension)) {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    } else if (['.txt', '.ts', '.js', '.py', '.json', '.md', '.tsx', '.jsx'].includes(extension)) {
      content = await fs.readFile(filePath, 'utf-8');
    }

    res.json({
      status: 'success',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/files/${req.file.filename}`,
      content: content.substring(0, 50000) // Limit content size for prompt safety
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

async function getFileTree(dir: string, base: string = ''): Promise<any[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nodes = [];

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', '.next'].includes(entry.name)) continue;
      
      const relPath = path.join(base, entry.name);
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          type: 'directory',
          path: relPath,
          children: await getFileTree(fullPath, relPath)
        });
      } else {
        nodes.push({
          name: entry.name,
          type: 'file',
          path: relPath
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  } catch (e) {
    return [];
  }
}

router.get('/list', async (req, res) => {
  try {
    const tree = await getFileTree(finalRootDir);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Helper to prevent path traversal
function getSecurePath(userPath: string, root: string): string {
  const resolvedPath = path.resolve(root, userPath);
  if (!resolvedPath.startsWith(path.resolve(root))) {
    throw new Error('Access denied: Path traversal detected.');
  }
  return resolvedPath;
}

router.get('/read', async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    const fullPath = getSecurePath(filePath as string, finalRootDir);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to read file' });
  }
});

router.post('/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    const fullPath = getSecurePath(filePath, finalRootDir);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    res.json({ status: 'success' });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to write file' });
  }
});

router.post('/shell', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });
  try {
    const { toolService } = await import('../services/toolService');
    const result = await toolService.executeTool('run_shell', { command });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;