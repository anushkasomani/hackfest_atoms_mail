import mongoose from 'mongoose';
import Conversation from '../models/conversationModel.js';
import User from '../models/userModel.js';

// Debugging: Initial connection check
console.log('[DEBUG] Initial MongoDB connection state:', mongoose.connection.readyState);

// Create a new conversation (i.e. start a new chat session) and add the first message.
export const createConversation = async (req, res) => {
  try {
    console.log('[DEBUG] Received request to create conversation');
    console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));

    const { sender, receiver, subject, body, attachment } = req.body;

    // Debug: Verify database connection
    console.log('[DEBUG] Current MongoDB readyState:', mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      console.error('[ERROR] MongoDB not connected! Current state:', mongoose.connection.readyState);
      return res.status(500).json({ message: "Database connection not established" });
    }

    // Debug: Check users collection exists
    const collectionExists = await mongoose.connection.db.listCollections({ name: 'users' }).hasNext();
    console.log('[DEBUG] Users collection exists:', collectionExists);

    // Verify that both the sender and receiver have accounts.
    console.log(`[DEBUG] Searching for sender: ${sender}`);
    const senderUser = await User.findOne({ email: new RegExp(`^${sender}$`, 'i') });
    console.log('[DEBUG] Sender user found:', senderUser ? 'Yes' : 'No');

    console.log(`[DEBUG] Searching for receiver: ${receiver}`);
    const receiverUser = await User.findOne({ email: new RegExp(`^${receiver}$`, 'i') });
    console.log('[DEBUG] Receiver user found:', receiverUser ? 'Yes' : 'No');

    if (!senderUser) {
      console.error('[ERROR] Sender account not found for email:', sender);
      // Find similar emails for debugging
      const similarSenders = await User.find({ email: { $regex: sender, $options: 'i' } }).limit(3);
      console.log('[DEBUG] Similar sender emails found:', similarSenders.map(u => u.email));
      return res.status(404).json({ 
        message: "Sender account not found.",
        debug: {
          searchedEmail: sender,
          similarEmails: similarSenders.map(u => u.email)
        }
      });
    }

    if (!receiverUser) {
      console.error('[ERROR] Receiver account not found for email:', receiver);
      // Find similar emails for debugging
      const similarReceivers = await User.find({ email: { $regex: receiver, $options: 'i' } }).limit(3);
      console.log('[DEBUG] Similar receiver emails found:', similarReceivers.map(u => u.email));
      return res.status(404).json({ 
        message: "Receiver account not found.",
        debug: {
          searchedEmail: receiver,
          similarEmails: similarReceivers.map(u => u.email)
        }
      });
    }

    // Prepare participants array (emails in lowercase).
    const participants = [sender.toLowerCase(), receiver.toLowerCase()];
    console.log('[DEBUG] Conversation participants:', participants);

    // Create the new message object.
    const newMessage = {
      sender,
      receiver,
      subject,
      body,
      attachment: attachment || [],
      createdAt: new Date(),
    };
    console.log('[DEBUG] New message content:', newMessage);

    // Create a new conversation document.
    const conversation = new Conversation({
      participants,
      messages: [newMessage],
    });
    console.log('[DEBUG] Conversation object to save:', conversation);

    await conversation.save();
    console.log('[DEBUG] Conversation saved successfully. ID:', conversation.conversationId);

    res.status(201).json({ 
      message: "Conversation created and message sent.", 
      conversation 
    });

  } catch (error) {
    console.error('[ERROR] Error in createConversation:', error.message);
    console.error('[DEBUG] Error details:', {
      name: error.name,
      stack: error.stack,
      requestBody: req.body,
      mongooseState: mongoose.connection.readyState
    });
    
    res.status(500).json({ 
      message: "Server error in creating conversation.",
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.message,
          type: error.name
        }
      })
    });
  }
};

export const addReply = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { sender, receiver, subject, body, attachment } = req.body;

    // Validate users
    const [senderUser, receiverUser] = await Promise.all([
      User.findOne({ email: sender }),
      User.findOne({ email: receiver })
    ]);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ 
        message: "Sender or receiver account not found." 
      });
    }

    // Add reply
    const updatedConvo = await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $push: { 
          messages: { 
            sender, 
            receiver, 
            subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
            body,
            attachment: attachment || [],
            createdAt: new Date()
          } 
        },
        $set: { updatedAt: new Date() }
      },
      { new: true } // Return the updated document
    );

    if (!updatedConvo) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.status(200).json(updatedConvo);
  } catch (error) {
    console.error("Reply error:", error);
    res.status(500).json({ message: "Server error in adding reply." });
  }
};



// Get a specific conversation by its conversationId.
export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log('[DEBUG] Fetching conversation by ID:', conversationId);

    const conversation = await Conversation.findOne({ conversationId });
    console.log('[DEBUG] Conversation found:', conversation ? 'Yes' : 'No');

    if (!conversation) {
      console.error('[ERROR] Conversation not found for ID:', conversationId);
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.json(conversation);
  } catch (error) {
    console.error('[ERROR] Error in getConversationById:', error.message);
    console.error('[DEBUG] Error details:', {
      conversationId: req.params.conversationId,
      error: error.name,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: "Server error in fetching conversation.",
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.message
        }
      })
    });
  }
};

// Get all conversations for a given user (by email).
export const getConversationsForUser = async (req, res) => {
  try {
    const { email } = req.params;
    console.log('[DEBUG] Fetching conversations for user:', email.toLowerCase());

    const conversations = await Conversation.find({ 
      participants: email.toLowerCase() 
    }).sort({ updatedAt: -1 });
    console.log(conversations)
    console.log('[DEBUG] Conversations found:', conversations.length);

    res.json(conversations);
  } catch (error) {
    console.error('[ERROR] Error in getConversationsForUser:', error.message);
    console.error('[DEBUG] Error details:', {
      userEmail: req.params.email,
      error: error.name,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: "Server error in fetching conversations.",
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.message
        }
      })
    });
  }
};