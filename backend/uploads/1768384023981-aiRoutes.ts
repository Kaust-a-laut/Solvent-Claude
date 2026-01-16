import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();

router.post('/chat', AIController.chat);
router.post('/chat/stream', AIController.chatStream);
router.post('/compare', AIController.compare);
router.post('/generate-image', AIController.generateImage);
router.post('/waterfall', AIController.waterfall);
router.get('/models', AIController.listModels);
router.get('/health/services', AIController.checkHealth);

export default router;
