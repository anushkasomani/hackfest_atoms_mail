import express from 'express';
import { createConversation, getConversationById, getConversationsForUser,addReply,generateAiResponse  } from '../controllers/conversationController.js';

const router = express.Router();

// POST route to create a new conversation (start a new chat session).
router.post('/', createConversation);

// *** NEW ROUTE for AI Generation ***
// POST route to trigger AI generation for a specific conversation
router.post('/:conversationId/generate', generateAiResponse); // <--- Add this route


// GET route to retrieve a conversation by its unique conversationId.
router.get('/:conversationId', getConversationById);

// GET route to retrieve all conversations for a given user (by email).
router.get('/user/:email', getConversationsForUser);
router.post('/:conversationId/reply', addReply);
export default router;
