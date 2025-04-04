import express from 'express';
import { createConversation, getConversationById, getConversationsForUser,addReply  } from '../controllers/conversationController.js';

const router = express.Router();

// POST route to create a new conversation (start a new chat session).
router.post('/', createConversation);

// GET route to retrieve a conversation by its unique conversationId.
router.get('/:conversationId', getConversationById);

// GET route to retrieve all conversations for a given user (by email).
router.get('/user/:email', getConversationsForUser);
router.post('/:conversationId/reply', addReply);
export default router;
