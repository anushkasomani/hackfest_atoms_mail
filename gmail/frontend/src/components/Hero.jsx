import { useState } from 'react';
import { Container, Row, Col, ListGroup, Button, Form, Modal } from 'react-bootstrap';

const Dashboard = () => {
  const [showCompose, setShowCompose] = useState(false);

  const handleComposeClick = () => setShowCompose(true);
  const handleCloseCompose = () => setShowCompose(false);

  return (
    <div className="py-5">
      <Container fluid>
        <Row>
          {/* Sidebar */}
          <Col md={3} className="bg-light vh-100 p-3">
            <h4>Menu</h4>
            <ListGroup>
              <ListGroup.Item action href="#inbox">
                Inbox
              </ListGroup.Item>
              <ListGroup.Item action href="#sent">
                Sent
              </ListGroup.Item>
              <ListGroup.Item action href="#drafts">
                Drafts
              </ListGroup.Item>
              <ListGroup.Item action href="#trash">
                Trash
              </ListGroup.Item>
            </ListGroup>
            <Button variant="primary" className="mt-3 w-100" onClick={handleComposeClick}>
              Compose
            </Button>
          </Col>

          {/* Main Content */}
          <Col md={9} className="p-4">
            <h2>Welcome to Your Dashboard</h2>
            <p>Select an option from the menu to get started.</p>
          </Col>
        </Row>
      </Container>

      {/* Compose Email Modal */}
      <Modal show={showCompose} onHide={handleCloseCompose}>
        <Modal.Header closeButton>
          <Modal.Title>Compose Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formRecipient">
              <Form.Label>To</Form.Label>
              <Form.Control type="email" placeholder="Enter recipient email" />
            </Form.Group>
            <Form.Group controlId="formSubject" className="mt-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control type="text" placeholder="Enter subject" />
            </Form.Group>
            <Form.Group controlId="formMessage" className="mt-3">
              <Form.Label>Message</Form.Label>
              <Form.Control as="textarea" rows={5} placeholder="Enter your message" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCompose}>
            Close
          </Button>
          <Button variant="primary">Send</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Dashboard;
