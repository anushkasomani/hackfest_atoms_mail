import React from 'react';
import { Button, ListGroup, Card } from 'react-bootstrap'; // Ensure Card is imported

// Relative import within the same directory
import AiReplyBox from './AiReplyBox.jsx'; // Assuming .jsx extension


const ConversationDetail = ({
  conversation,
  onReplyClick, // For "Reply Manually" button -> opens ReplyModal via Dashboard

  // --- AI Related Props passed from Dashboard (Updated) ---
  showAiPrompt,       // boolean: whether the AI section is visible
  onToggleAiPrompt, // function: toggles visibility of AI section
  aiPrompt,           // string: current value of the AI prompt input
  setAiPrompt,        // function: updates the AI prompt state in Dashboard
  onGenerateAiReply,  // function: tells Dashboard to call the backend AI endpoint
  isGeneratingAiReply,// boolean: loading state for AI generation
  // Receive both summary and dialogues
  aiGeneratedSummary,   // string: the summary text received from AI (about attachments)
  aiFormattedDialogues, // string: the formatted conversation text received from AI/backend
  aiError,            // string: error message from AI generation attempt
  onUseAiReply        // function: tells Dashboard to use text (likely summary) in ReplyModal
  // --- End AI Props ---
}) => {

  // Handle cases where conversation data might not be ready yet
  if (!conversation) {
    return <p className="text-center my-3">Loading conversation details...</p>;
  }

  // Safely access messages
  const messages = conversation.messages || [];
  const firstMessage = messages[0] || {};

  return (
    <div className="conversation-detail">
      {/* Display Subject */}
      <h4 className="mb-3">{firstMessage.subject || '(No Subject)'}</h4>

      {/* List of Messages (Keep existing rendering logic) */}
      <ListGroup variant="flush" className="message-list mb-3 border rounded">
        {messages.length > 0 ? messages.map((msg, index) => (
          <ListGroup.Item key={msg._id || index} className="message-item px-3 py-2">
            <div className="message-header d-flex justify-content-between align-items-center mb-1">
              <div>
                 <small><strong>From:</strong> {msg.sender || 'N/A'}</small> | <small><strong>To:</strong> {msg.receiver || 'N/A'}</small>
              </div>
              <small className="message-date text-muted">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A'}
              </small>
            </div>
            <p className="message-body mb-1" style={{ whiteSpace: 'pre-wrap' }}>{msg.body || '(Empty message)'}</p>
            {/* Display Attachments if they exist */}
            {msg.attachment && msg.attachment.length > 0 && (
               <div className="attachments mt-2">
                 <small><strong>Attachments:</strong></small>
                 <ul className="list-unstyled mb-0 ps-3">
                   {msg.attachment.map((url, idx) => ( // Assuming attachment is array of URLs for display here
                     <li key={idx}>
                       <small>
                         <a href={url} target="_blank" rel="noopener noreferrer" className="attachment-link">
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

      {/* Action Buttons (Keep existing) */}
      <div className="action-buttons mb-3 d-flex gap-2">
        <Button variant="outline-secondary" size="sm" onClick={onReplyClick}>
          Reply Manually
        </Button>
        <Button variant="outline-info" size="sm" onClick={onToggleAiPrompt}>
          {showAiPrompt ? 'Hide AI Helper' : 'Reply with AI'}
        </Button>
      </div>

      {/* Conditionally render AI Reply Box based on showAiPrompt state */}
      {/* Pass down the updated props */}
      {showAiPrompt && (
        <AiReplyBox
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          onGenerate={onGenerateAiReply}
          isLoading={isGeneratingAiReply}
          // Pass both summary and dialogues
          generatedSummary={aiGeneratedSummary}
          formattedDialogues={aiFormattedDialogues}
          error={aiError}
          // Pass the summary text when "Use this Reply" is clicked
          onUseReply={() => onUseAiReply(aiGeneratedSummary || '')}
        />
      )}
    </div>
  );
};

export default ConversationDetail;