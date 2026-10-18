import express from 'express';
import { getMessages, getQueueStatus, verifyWebhook, handleWebhook, enqueueMessage, retryMessage } from '../../controllers/message.controller/message.controller.js';

const router = express.Router();

router.get('/messages', getMessages);
router.get('/messages/status', getQueueStatus);
router.post('/messages/send', enqueueMessage);
router.post('/messages/:id/retry', retryMessage);

// Meta Webhook Endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

export default router;
