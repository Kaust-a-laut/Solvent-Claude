import { config } from './config'; // Removed .js for safety
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Import Routes ---
// We removed the .js extension here so it automatically finds fileRoutes.ts
import fileRoutes from './routes/fileRoutes'; 
import aiRoutes from './routes/aiRoutes';

// --- Fix for __dirname in ES Modules ---
// We are in CommonJS mode now due to tsconfig, so these are globals.
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// --- Initialize App ---
const app = express();
const port = config.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Directory Setup ---
// FIX 1: Go up one level (..) to reach the project root
const generatedImagesDir = path.join(__dirname, '../generated_images');
const uploadDir = path.join(__dirname, '../uploads'); 

// Ensure directories exist
if (!fs.existsSync(generatedImagesDir)) fs.mkdirSync(generatedImagesDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Static Files ---
app.use('/generated_images', express.static(generatedImagesDir));
// FIX 2: Now this matches where the route saves files
app.use('/files', express.static(uploadDir));

// --- API Routes ---
app.use('/api/v1', aiRoutes);
app.use('/api/files', fileRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
