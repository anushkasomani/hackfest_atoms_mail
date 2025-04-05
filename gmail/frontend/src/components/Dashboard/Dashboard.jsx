import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col, Modal } from 'react-bootstrap';
import axios from 'axios';
import Sidebar from './Sidebar';
import InboxList from './InboxList';
import ConversationDetail from './ConversationDetail';
import ReplyModal from './ReplyModal';
import ComposeModal from './ComposeModal';
import './Dashboard.css';

const Dashboard = () => {
  const [emails, setEmails] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeData, setComposeData] = useState({ receiver: '', subject: '', body: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await axios.get(`/api/conversations/user/${userInfo.email}`);
        setEmails(response.data);
      } catch (err) {
        console.error('Failed to fetch emails:', err);
      }
    };
    fetchEmails();
  }, [userInfo.email]);

  const handleEmailClick = async (conversationId) => {
    try {
      const response = await axios.get(`/api/conversations/${conversationId}`);
      setSelectedConversation(response.data);
      console.log("these are the convos", response.data);
      setShowModal(true); // Open the modal
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  };

  const handleReplyClick = () => setShowReplyModal(true);

  const handleSendReply = async () => {
    try {
      if (!replyMessage) {
        setError('Reply message cannot be empty.');
        return;
      }
      const { conversationId } = selectedConversation;
      const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
      const replyData = {
        sender: userInfo.email,
        receiver: lastMessage.sender === userInfo.email ? lastMessage.receiver : lastMessage.sender,
        subject: `Re: ${lastMessage.subject}`,
        body: replyMessage,
      };
      await axios.post(`/api/conversations/${conversationId}/reply`, replyData);
      setSuccess('Reply sent successfully!');
      setShowReplyModal(false);
      setReplyMessage('');
      setError('');
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError('Failed to send reply. Please try again.');
    }
  };
  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'check123');
    
    try {
      setIsUploading(true);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/dx3y6lm0i/upload`,
        formData
      );
      return response.data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!composeData.receiver || !composeData.subject || !composeData.body) {
        setError('All fields are required.');
        return;
      }
      let attachmentUrl = '';
      if(attachment) {
        attachmentUrl = await uploadToCloudinary(attachment);
      }
      const emailData = {
        sender: userInfo.email,
        receiver: composeData.receiver,
        subject: composeData.subject,
        body: composeData.body,
        attachment: attachmentUrl ? [attachmentUrl] : [],
      };
      
      const response = await axios.post('/api/conversations', emailData);
      if (response.status === 201) {
        setSuccess('Email sent successfully!');
        const updatedResponse = await axios.get(`/api/conversations/user/${userInfo.email}`);
        setEmails(updatedResponse.data);
        setComposeData({ receiver: '', subject: '', body: '' });
        setTimeout(() => {
          setShowComposeModal(false);
          setSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      setError(err.response?.data?.message || 'Failed to send email. Please try again.');
    }
  };

  return (
    <div className="dashboard-container">
      <Container fluid>
        <Row>
          <Col md={3} className="sidebar-container">
            <Sidebar onCompose={() => setShowComposeModal(true)} />
          </Col>
          <Col md={9} className="content-container">
            <h2 className="inbox-title">Inbox</h2>
            <InboxList emails={emails} onEmailClick={handleEmailClick} userEmail={userInfo.email} />
          </Col>
        </Row>
      </Container>

      {/* Modal for Conversation Details */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Conversation Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedConversation && (
            <ConversationDetail
              conversation={selectedConversation}
              onReplyClick={handleReplyClick}
            />
          )}
        </Modal.Body>
      </Modal>

      <ReplyModal
        show={showReplyModal}
        onHide={() => setShowReplyModal(false)}
        message={replyMessage}
        setMessage={setReplyMessage}
        onSend={handleSendReply}
        error={error}
        success={success}
      />
      <ComposeModal
  show={showComposeModal}
  onHide={() => setShowComposeModal(false)}
  formData={composeData}
  setFormData={setComposeData}
  onSend={handleSendEmail}
  error={error}
  success={success}
  setAttachment={setAttachment}
/>
    </div>
  );
};

export default Dashboard;