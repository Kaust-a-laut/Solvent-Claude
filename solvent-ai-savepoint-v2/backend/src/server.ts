import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import aiRoutes from './routes/aiRoutes';

const app = express();
const port = Number(process.env.PORT) || 3001;

// Ensure generated_images directory exists
const generatedImagesDir = path.join(__dirname, '../generated_images');
if (!fs.existsSync(generatedImagesDir)) {
  fs.mkdirSync(generatedImagesDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// Serve generated images
app.use('/generated_images', express.static(generatedImagesDir));

// Routes
app.use('/api/v1', aiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
