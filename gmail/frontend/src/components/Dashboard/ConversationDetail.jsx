import React, { useState } from 'react';
import { Button, ListGroup, Form, Alert, Row, Col, Card } from 'react-bootstrap';
import AiReplyBox from './AiReplyBox';
import './Dashboard.css';

const ConversationDetail = ({
  conversation,
  showAiPrompt,
  onToggleAiPrompt,
  aiPrompt,
  setAiPrompt,
  onGenerateAiReply,
  isGeneratingAiReply,
  aiGeneratedReply,
  aiError,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!conversation) return <p className="text-center my-3">Loading conversation details...</p>;

  const messages = conversation.messages || [];
  const firstMessage = messages[0] || {};

  const handleSendReply = () => {
    if (!replyMessage.trim()) {
      setError('Reply message cannot be empty.');
      return;
    }

    // Simulate sending
    setTimeout(() => {
      setSuccess('Reply sent successfully!');
      setError('');
      setReplyMessage('');
      setAttachment(null);
    }, 1000);
  };

  const handleUseAiReply = () => {
    if (aiGeneratedReply) setReplyMessage(aiGeneratedReply);
  };

  return (
    <div className="conversation-detail">
      <h5 className="mb-3">Subject : {firstMessage.subject || '(No Subject)'}</h5>

      <Row>
        <Col md={showReplyForm ? 7 : 12}>
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
                <p className="message-body mb-1" style={{ whiteSpace: 'pre-wrap' }}>Body : {msg.body || '(Empty message)'}</p>

                {msg.attachment && msg.attachment.length > 0 && (
                  <div className="attachments mt-2">
                    <small><strong>Attachments:</strong></small>
                    <ul className="list-unstyled mb-0 ps-3">
                      {msg.attachment.map((url, idx) => (
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

          <div className="action-buttons mb-3 d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => setShowReplyForm(!showReplyForm)} className="ai-helper-btn">
              {showReplyForm ? 'Cancel Manual Reply' : 'Reply Manually'}
            </Button>
            <Button variant="outline-info" size="sm" className="ai-helper-btn" onClick={onToggleAiPrompt}>
              {showAiPrompt ? 'Hide AI Helper' : 'Reply with AI'}
            </Button>
          </div>

          {showAiPrompt && (
            <AiReplyBox
              prompt={aiPrompt}
              setPrompt={setAiPrompt}
              onGenerate={onGenerateAiReply}
              isLoading={isGeneratingAiReply}
              generatedReply={aiGeneratedReply}
              error={aiError}
              onUseReply={handleUseAiReply}
            />
          )}
        </Col>

        {/* Inline Reply Form */}
        {showReplyForm && (
          <Col md={5}>
            <Card className="bg-white text-dark">
              <Card.Header>Reply</Card.Header>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form>
                  <Form.Group controlId="formReplyMessage">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      className="bg-light text-light"
                      placeholder="Enter your reply"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group controlId="formReplyAttachment" className="mt-3">
                    <Form.Label>Attachment</Form.Label>
                    <Form.Control
                      type="file"
                      className="bg-light text-dark"
                      onChange={(e) => setAttachment(e.target.files[0])}
                    />
                  </Form.Group>

                  <div className="mt-3 d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                    <Button style={{ backgroundColor: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={handleSendReply}>Send Reply</Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ConversationDetail;
