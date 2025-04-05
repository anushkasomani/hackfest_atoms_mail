import { useState } from 'react';
import { useSelector } from 'react-redux'; 
import { Container, Row, Col, Button, Form, Modal, ListGroup, Alert } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const Dashboard = () => {
  const [showCompose, setShowCompose] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { userInfo } = useSelector((state) => state.auth); 

  const handleComposeClick = () => setShowCompose(true);
  const handleCloseCompose = () => {
    setShowCompose(false);
    setRecipient('');
    setSubject('');
    setMessage('');
    setAttachment(null);
    setError('');
    setSuccess('');
  };

  const handleSendEmail = async () => {
    try {
      setError('');
      setSuccess('');

      // Validate inputs
      if (!recipient || !subject || !message) {
        setError('All fields are required.');
        return;
      }

      // Prepare the email data
      const emailData = {
        sender: userInfo.email, // Dynamically use the logged-in user's email
        receiver: recipient,
        subject,
        body: message,
        attachment: attachment ? [attachment] : [],
      };

      // Send the email data to the backend
      const response = await axios.post('/api/conversations', emailData);

      if (response.status === 201) {
        setSuccess('Email sent successfully!');
        handleCloseCompose();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send email. Please try again.');
    }
  };

  return (
    <div className="min-vh-100 bg-dark text-light">
      <Container fluid>
        <Row>
          {/* Sidebar */}
          <Col md={3} className="bg-secondary vh-100 p-3">
            <h4 className="text-center">Menu</h4>
            <ListGroup variant="flush">
              <ListGroup.Item action href="#inbox" className="bg-dark text-light border-0">
                Inbox
              </ListGroup.Item>
            </ListGroup>
            <Button variant="success" className="mt-3 w-100" onClick={handleComposeClick}>
              Compose
            </Button>
          </Col>

          {/* Main Content */}
          <Col md={9} className="p-4">
            <h2>Inbox</h2>
            <p>Your emails will appear here.</p>
          </Col>
        </Row>
      </Container>

      {/* Compose Email Modal */}
      <Modal show={showCompose} onHide={handleCloseCompose} centered>
        <Modal.Header closeButton className="bg-dark text-light">
          <Modal.Title>Compose Email</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light">
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form>
            <Form.Group controlId="formRecipient">
              <Form.Label>To</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter recipient email"
                className="bg-secondary text-light"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formSubject" className="mt-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter subject"
                className="bg-secondary text-light"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formMessage" className="mt-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Enter your message"
                className="bg-secondary text-light"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="formAttachment" className="mt-3">
              <Form.Label>Attachment</Form.Label>
              <Form.Control
                type="file"
                className="bg-secondary text-light"
                onChange={(e) => setAttachment(e.target.files[0]?.name)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-light">
          <Button variant="secondary" onClick={handleCloseCompose}>
            Close
          </Button>
          <Button variant="success" onClick={handleSendEmail}>
            Send
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Dashboard;