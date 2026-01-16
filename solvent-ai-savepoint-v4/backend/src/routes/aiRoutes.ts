import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();

router.post('/chat', AIController.chat);
router.post('/compare', AIController.compare);
router.post('/generate-image', AIController.generateImage);
router.get('/models', AIController.listModels);

export default router;
