import mongoose from 'mongoose';

const messageSchema = mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  receiver: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  attachment: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = mongoose.Schema(
  {
    // This will be generated automatically in the pre-validation hook.
    conversationId: {
      type: String,
      required: true,
      unique: true,
    },
    // The participants are stored as an array of emails.
    participants: {
      type: [String],
      required: true,
    },
    // The messages array holds the entire thread for this conversation.
    messages: [messageSchema],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields.
  }
);

// Pre-validation hook to generate a unique conversationId
// even if the same participants have had past chats.
conversationSchema.pre('validate', function (next) {
  if (!this.conversationId && this.participants && this.participants.length > 0) {
    // Convert emails to lowercase and sort them to maintain consistency.
    const sortedParticipants = this.participants.map(p => p.toLowerCase()).sort();
    // Append a timestamp to ensure uniqueness for each new chat session.
    this.conversationId = `${sortedParticipants.join('_')}_${Date.now()}`;
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
