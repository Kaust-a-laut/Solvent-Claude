import { config } from './config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

// --- Import Routes ---
import fileRoutes from './routes/fileRoutes';
import aiRoutes from './routes/aiRoutes';
import debugRoutes from './routes/debugRoutes';
import settingsRoutes from './routes/settingsRoutes';

import { createServer } from 'http';
import { Server } from 'socket.io';
import { supervisorService } from './services/supervisorService';
import { pluginManager } from './services/pluginManager';
import { settingsService } from './services/settingsService';
import { taskService, TaskQueue } from './services/taskService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = config.PORT || 3001;

// --- Socket Connection ---
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('SYNC_NOTES', async (data) => {
    // Reactive graph + crystallization
    await supervisorService.supervise(data.content, data.graph);
    // Proactive Overseer think() — fire-and-forget with notepad as primary signal
    supervisorService.think({
      activity: 'notepad_change',
      data: { notepadContent: data.content }
    }).catch(() => {});
  });

  // Memory crystallization event → trigger Overseer awareness
  socket.on('CRYSTALLIZE_MEMORY', (data) => {
    supervisorService.think({
      activity: 'memory_crystallized',
      data: { focus: data.content, notepadContent: data.content }
    }).catch(() => {});
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

supervisorService.setIO(io);

// --- Mission Progress Bridge: BullMQ → Socket.io ---
// Workers can't access Socket.io directly; QueueEvents bridges the gap
try {
  const orchestrationEvents = taskService.getQueueEvents(TaskQueue.ORCHESTRATION);

  orchestrationEvents.on('progress', ({ jobId, data }: { jobId: string; data: unknown }) => {
    io.emit('MISSION_PROGRESS', { jobId, progress: data });
  });

  orchestrationEvents.on('completed', ({ jobId, returnvalue }: { jobId: string; returnvalue: unknown }) => {
    io.emit('MISSION_COMPLETE', { jobId, result: returnvalue });
    // Overseer: analyze the completed mission in context
    supervisorService.think({
      activity: 'mission_completed',
      data: { missionId: jobId, result: returnvalue }
    }).catch(() => {});
  });

  orchestrationEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    io.emit('MISSION_FAILED', { jobId, error: failedReason });
  });

  console.log('[Server] Mission progress bridge initialized');
} catch (err) {
  console.warn('[Server] Mission progress bridge unavailable (Redis may not be running):', err);
}

// --- Global Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Security Middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// --- Directory Setup ---
const generatedImagesDir = path.join(__dirname, '../generated_images');
const uploadDir = path.join(__dirname, '../uploads'); 

if (!fs.existsSync(generatedImagesDir)) fs.mkdirSync(generatedImagesDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Static Files (Publicly Accessible for Frontend <img> tags) ---
app.use('/generated_images', express.static(generatedImagesDir));
app.use('/files', express.static(uploadDir));

const API_SECRET = config.BACKEND_INTERNAL_SECRET;

console.log(`[Server] API_SECRET initialized: ${API_SECRET === 'solvent_dev_insecure_default' ? '✓ Using default (dev mode)' : '✓ Using custom secret'}`);

// Security Middleware
app.use((req, res, next) => {
  // Skip secret check for local static images or health checks if needed
  if (req.path.startsWith('/generated_images') || req.path === '/health') return next();

  const clientSecret = req.headers['x-solvent-secret'];
  if (clientSecret !== API_SECRET) {
    console.warn(`[SECURITY] Unauthorized request to ${req.path} from ${req.ip}`);
    console.warn(`[SECURITY] Expected secret: ${API_SECRET}`);
    console.warn(`[SECURITY] Received secret: ${clientSecret || '(none)'}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid session secret' });
  }
  next();
});

// --- API Routes ---
app.use('/api/v1', aiRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/settings', settingsRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Error Handling Middleware ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
});

// Initialize the settings service
settingsService.initialize()
  .then(() => {
    console.log('[Server] Settings service initialized successfully');
  })
  .catch((error) => {
    console.error('[Server] Failed to initialize settings service:', error);
  });

// Initialize the plugin manager
pluginManager.initialize()
  .then(() => {
    console.log('[Server] Plugin system initialized successfully');
  })
  .catch((error) => {
    console.error('[Server] Failed to initialize plugin system:', error);
  });

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server with Real-Time Overseer running on http://0.0.0.0:${port}`);
});