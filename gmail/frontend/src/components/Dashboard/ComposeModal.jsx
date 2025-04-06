import React from "react";
import { Modal, Form, Alert, Button } from "react-bootstrap";
const ComposeModal = ({ show, onHide, formData = {}, setFormData, onSend, error, success, setAttachment }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-light">
        <Modal.Title>Compose Email</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form>
          <Form.Group controlId="formReceiver" className="mb-3">
            <Form.Label>To</Form.Label>
            <Form.Control
              type="email"
              name="receiver"
              className="bg-secondary text-light"
              placeholder="Enter recipient email"
              value={formData.receiver || ''}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group controlId="formSubject" className="mb-3">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              name="subject"
              className="bg-secondary text-light"
              placeholder="Enter subject"
              value={formData.subject || ''}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group controlId="formBody" className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              name="body"
              className="bg-secondary text-light"
              placeholder="Enter your message"
              value={formData.body || ''}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group controlId="formAttachment" className="mb-3">
            <Form.Label>Attachment</Form.Label>
            <Form.Control
              type="file"
              className="bg-secondary text-light"
              onChange={handleFileChange}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="bg-dark text-light">
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="success" onClick={onSend}>Send Email</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ComposeModal