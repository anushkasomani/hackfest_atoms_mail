import React from 'react';
import { Form, Button, Spinner, Alert, Card } from 'react-bootstrap';

const AiReplyBox = ({
  prompt,
  setPrompt,
  onGenerate,
  isLoading,
  generatedReply,
  error,
  onUseReply
}) => {
  return (
    <Card className="mt-3 border-0 shadow-lg" style={{ backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
      <Card.Body>
        <Card.Title className="mb-3 h5 text-center text-dark" >
           Generate Reply with AI 
        </Card.Title>

        {error && (
          <Alert variant="danger" className="mt-2 py-2 px-3 small">
            {error}
          </Alert>
        )}

        <Form.Group controlId="aiPromptTextArea" className="mb-3">
          <Form.Label className="small mb-2 text-dark fw-bold" >
            Your Instruction/Prompt for AI:
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="e.g., Write a polite refusal based on the last message."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="form-control-sm"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #4c1d95',
              borderRadius: '8px',
              color: '#4c1d95'
            }}
          />
        </Form.Group>

        <div className="text-center">
          <Button
            onClick={onGenerate}
            disabled={isLoading || !prompt.trim()}
            size="sm"
            style={{
              backgroundColor: '#ff6b6b',
              borderColor: '#ff6b6b',
              borderRadius: '8px',
              padding: '6px 12px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-1">Generating...</span>
              </>
            ) : (
              'Generate AI Reply'
            )}
          </Button>
        </div>

        {generatedReply && !isLoading && (
          <Card className="mt-4 border-0 shadow-sm" style={{ backgroundColor: '#ffffff', borderRadius: '12px' }}>
            <Card.Header
              as="h6"
              className="py-2 px-3 text-white small"
              style={{ backgroundColor: '#4c1d95', borderRadius: '12px 12px 0 0' }}
            >
              Suggested Reply:
            </Card.Header>
            <Card.Body className="p-3">
              <pre
                className="mb-3 small"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  color: '#333',
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}
              >
                {generatedReply}
              </pre>
              <div className="text-center">
                <Button
                  variant="success"
                  size="sm"
                  style={{
                    backgroundColor: '#4c1d95',
                    borderColor: '#4c1d95',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontWeight: 'bold'
                  }}
                  onClick={() => onUseReply(generatedReply)}
                >
                  Use this Reply
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}
      </Card.Body>
    </Card>
  );
};

export default AiReplyBox;