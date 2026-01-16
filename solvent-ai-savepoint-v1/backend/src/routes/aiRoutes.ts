import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();

router.post('/chat', AIController.chat);
router.get('/models', AIController.listModels);

export default router;
