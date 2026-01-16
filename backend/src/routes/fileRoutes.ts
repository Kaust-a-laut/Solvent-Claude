import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileService } from '../services/fileService';

const router = express.Router();

// --- Storage Config ---
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = fileService.getUploadDir();
    await fileService.ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- ROUTES ---

// A. Upload & Read
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
       res.status(400).json({ error: 'No file uploaded' });
       return;
    }

    const fullPath = path.join(req.file.destination, req.file.filename);
    const extractedText = await fileService.extractText(fullPath, req.file.mimetype, req.file.originalname);

    // Trim to 20k chars for response
    const previewText = extractedText.length > 0 ? extractedText.slice(0, 20000) : null;

    res.json({ 
        message: 'File uploaded & parsed', 
        filename: req.file.filename,
        url: `/files/${req.file.filename}`,
        content: previewText 
    });

  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// B. List Files
router.get('/list', async (req: Request, res: Response) => {
  try {
    const fileInfos = await fileService.listFiles();
    res.json(fileInfos);
  } catch (error) {
    res.status(500).json({ message: 'Error scanning files' });
  }
});

// C. Download
router.get('/download/:name', (req: Request, res: Response) => {
  const directoryPath = fileService.getUploadDir();
  const filePath = path.join(directoryPath, req.params.name);
  
  res.download(filePath, req.params.name, (err) => {
    if (err && !res.headersSent) {
      res.status(500).send({ message: "Download failed." });
    }
  });
});

// D. Delete
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    await fileService.deleteFile(req.params.name);
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

export default router;
