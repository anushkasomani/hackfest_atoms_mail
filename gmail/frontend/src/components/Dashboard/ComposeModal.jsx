// Inside src/components/dashboard/ComposeModal.jsx
import React from 'react'; // Ensure React is imported if not already
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';

const ComposeModal = ({
  show,
  onHide,
  formData,
  setFormData,
  onSend,
  error,
  success,
  setAttachment, // This prop receives handleComposeFileChange from Dashboard
  isSending
}) => {

  // Handler within ComposeModal (optional, can directly use prop in onChange)
  // const handleFileChange = (event) => {
  //   setAttachment(event); // Pass the whole event object up
  // };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-dark text-light py-2">
        <Modal.Title className="h6">Compose New Email</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light">
        {error && <Alert variant="danger" className="py-1 px-2 small">{error}</Alert>}
        {success && <Alert variant="success" className="py-1 px-2 small">{success}</Alert>}
        <Form>
          <Form.Group className="mb-2" controlId="composeReceiver">
            <Form.Label className="small mb-1">To:</Form.Label>
            <Form.Control
              type="email"
              placeholder="Recipient email"
              name="receiver"
              value={formData.receiver}
              onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
              disabled={isSending || !!success}
              className="bg-secondary text-light form-control-sm"
              required
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="composeSubject">
            <Form.Label className="small mb-1">Subject:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Email subject"
              name="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              disabled={isSending || !!success}
              className="bg-secondary text-light form-control-sm"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="composeBody">
            <Form.Label className="small mb-1">Body:</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              placeholder="Compose your email..."
              name="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              disabled={isSending || !!success}
              className="bg-secondary text-light form-control-sm"
              required
            />
          </Form.Group>
          <Form.Group controlId="composeAttachment" className="mb-2">
            <Form.Label className="small mb-1">Attachment (Optional)</Form.Label>
            <Form.Control
              type="file"
              className="bg-secondary text-light form-control-sm"
              // --- *** CHANGE HERE *** ---
              // Directly pass the event object to the prop function
              onChange={setAttachment}
              // --- *** END CHANGE *** ---
              disabled={isSending || !!success}
            />
            {/* You could display the selected filename here */}
             {/* {composeAttachment && <small className="text-muted d-block mt-1">{composeAttachment.name}</small>} */}
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="bg-dark text-light py-2">
        <Button variant="secondary" size="sm" onClick={onHide} disabled={isSending}>
          Cancel
        </Button>
        <Button
           variant="primary" // Changed to primary for compose
           size="sm"
           onClick={onSend}
           disabled={!formData.receiver || !formData.subject || !formData.body || isSending || !!success}
        >
           {isSending ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-1">Sending...</span>
              </>
            ) : success ? 'Sent!' : 'Send Email'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ComposeModal;