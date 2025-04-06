import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import axios from 'axios';

import Sidebar from './Sidebar'; // If you want the sidebar on this page too
import './ConversationPage.css'; // We'll define some custom styling

const ConversationPage = () => {
  const { id } = useParams(); // conversationId from the URL
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [error, setError] = useState('');

  // Example AI states (optional)
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedReply, setAiGeneratedReply] = useState('');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setError('');
        const response = await axios.get(`/api/conversations/${id}`);
        setConversation(response.data);
      } catch (err) {
        console.error('Failed to fetch conversation:', err);
        setError(err.response?.data?.message || 'Failed to load conversation details.');
      }
    };
    fetchConversation();
  }, [id]);

  // Example: AI generation function
  const handleGenerateAiReply = async () => {
    try {
      // Your AI logic here
    } catch (err) {
      setAiError('Could not get AI suggestion.');
    }
  };

  // Example: go back to inbox
  const handleBackToInbox = () => {
    navigate('/');
  };

  return (
    <div className="conversation-page">
      {/* If you want the same layout with sidebar */}
      <Container fluid className="h-100">
        <Row className="h-100">
          <Col md={3} className="sidebar-container">
            <Sidebar />
          </Col>
          <Col md={9} className="conversation-content">
            <div className="top-bar">
              <h4>Conversation Details</h4>
              <Button variant="outline-light" onClick={handleBackToInbox}>
                Back to Inbox
              </Button>
            </div>

            {/* Show error or conversation */}
            {error && <p className="text-danger">{error}</p>}
            {!error && conversation && (
              <div className="conversation-card">
                <h5>{conversation.messages[0]?.subject || 'No Subject'}</h5>
                <p><strong>From:</strong> {conversation.messages[0]?.sender}</p>
                <p><strong>To:</strong> {conversation.messages[0]?.receiver}</p>
                <p>{conversation.messages[0]?.body}</p>

                {/* If there are multiple messages, you can map them here */}
                {/* conversation.messages.map(...) */}
              </div>
            )}

            {/* Action buttons (Reply Assist, Summarize, Translate) */}
            <div className="conversation-actions">
              <Button
                variant="outline-light"
                onClick={() => alert('Reply Assist clicked')}
              >
                Reply Assist
              </Button>
              <Button
                variant="outline-light"
                onClick={() => alert('Summarize clicked')}
              >
                Summarize
              </Button>
              <Button
                variant="outline-light"
                onClick={() => alert('Translate clicked')}
              >
                Translate
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ConversationPage;
