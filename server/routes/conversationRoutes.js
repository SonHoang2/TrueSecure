import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as conversationController from '../controllers/conversationController.js';

const router = Router();

router.use(authController.protect);

router.route('/')
    .post(conversationController.createConversation);

router.route('/')
    .get(conversationController.getConversations);

router.route('/:id/messages')
    .get(conversationController.getConversationMessages);


export default router;