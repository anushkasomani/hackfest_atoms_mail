import React from 'react';
import { Button, ListGroup, Card } from 'react-bootstrap'; // Removed Badge, added Card

// Relative import within the same directory
import AiReplyBox from './AiReplyBox';


const ConversationDetail = ({
  conversation,
  onReplyClick, // For "Reply Manually" button -> opens ReplyModal via Dashboard

  // --- AI Related Props passed from Dashboard ---
  showAiPrompt,       // boolean: whether the AI section is visible
  onToggleAiPrompt, // function: toggles visibility of AI section
  aiPrompt,           // string: current value of the AI prompt input
  setAiPrompt,        // function: updates the AI prompt state in Dashboard
  onGenerateAiReply,  // function: tells Dashboard to call the backend AI endpoint
  isGeneratingAiReply,// boolean: loading state for AI generation
  aiGeneratedReply,   // string: the reply text received from AI
  aiError,            // string: error message from AI generation attempt
  onUseAiReply        // function: tells Dashboard to use the generated text in ReplyModal
  // --- End AI Props ---
}) => {

  // Handle cases where conversation data might not be ready yet
  if (!conversation) {
    // This case should ideally be handled by the parent (Dashboard) showing a loading state
    // But adding a fallback here just in case.
    return <p className="text-center my-3">Loading conversation details...</p>;
  }

  // Safely access messages, providing an empty array as default if needed
  const messages = conversation.messages || [];
  const firstMessage = messages[0] || {}; // Get first message for subject

  return (
    <div className="conversation-detail">
      {/* Display Subject from the first message */}
      <h4 className="mb-3">{firstMessage.subject || '(No Subject)'}</h4>

      {/* List of Messages */}
      <ListGroup variant="flush" className="message-list mb-3 border rounded">
        {messages.length > 0 ? messages.map((msg, index) => (
          <ListGroup.Item key={msg._id || index} className="message-item px-3 py-2"> {/* Use _id if available */}
            <div className="message-header d-flex justify-content-between align-items-center mb-1">
              <div>
                 <small><strong>From:</strong> {msg.sender || 'N/A'}</small> | <small><strong>To:</strong> {msg.receiver || 'N/A'}</small>
              </div>
              <small className="message-date text-muted">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A'}
              </small>
            </div>
            {/* Use pre-wrap to respect newlines in the body */}
            <p className="message-body mb-1" style={{ whiteSpace: 'pre-wrap' }}>{msg.body || '(Empty message)'}</p>

            {/* Display Attachments if they exist */}
            {msg.attachment && msg.attachment.length > 0 && (
               <div className="attachments mt-2">
                 <small><strong>Attachments:</strong></small>
                 <ul className="list-unstyled mb-0 ps-3">
                   {msg.attachment.map((url, idx) => (
                     <li key={idx}>
                       <small>
                         <a href={url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                           {/* Try to get filename, fallback to generic name */}
                           {url.substring(url.lastIndexOf('/') + 1) || `Attachment ${idx + 1}`}
                         </a>
                       </small>
                     </li>
                   ))}
                 </ul>
               </div>
            )}
          </ListGroup.Item>
        )) : (
          <ListGroup.Item className="text-center text-muted">
              No messages in this conversation yet.
          </ListGroup.Item>
        )}
      </ListGroup>

      {/* Action Buttons */}
      <div className="action-buttons mb-3 d-flex gap-2">
        <Button variant="outline-secondary" size="sm" onClick={onReplyClick}>
          Reply Manually
        </Button>
        <Button variant="outline-info" size="sm" onClick={onToggleAiPrompt}>
          {showAiPrompt ? 'Hide AI Helper' : 'Reply with AI'}
        </Button>
      </div>

      {/* Conditionally render AI Reply Box based on showAiPrompt state */}
      {showAiPrompt && (
        <AiReplyBox
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          onGenerate={onGenerateAiReply}
          isLoading={isGeneratingAiReply}
          generatedReply={aiGeneratedReply}
          error={aiError}
          onUseReply={onUseAiReply} // Pass the handler down
        />
      )}
    </div>
  );
};

export default ConversationDetail;