import { Modal, Form, Button, Alert } from 'react-bootstrap';

const ReplyModal = ({ show, onHide, message, setMessage, onSend, error, success }) => (
  <Modal show={show} onHide={onHide} centered>
    <Modal.Header closeButton className="bg-dark text-light">
      <Modal.Title>Reply</Modal.Title>
    </Modal.Header>
    <Modal.Body className="bg-dark text-light">
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form>
        <Form.Group controlId="formReplyMessage">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            className="bg-secondary text-light"
            placeholder="Enter your reply"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Form.Group>
      </Form>
    </Modal.Body>
    <Modal.Footer className="bg-dark text-light">
      <Button variant="secondary" onClick={onHide}>Close</Button>
      <Button variant="success" onClick={onSend}>Send Reply</Button>
    </Modal.Footer>
  </Modal>
);

export default ReplyModal;
