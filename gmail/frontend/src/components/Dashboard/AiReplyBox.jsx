import React from 'react';
import { Form, Button, Spinner, Alert, Card } from 'react-bootstrap';

const AiReplyBox = ({
  prompt,             // string: current prompt text
  setPrompt,          // function: to update the prompt in parent state
  onGenerate,         // function: to trigger AI generation in parent
  isLoading,          // boolean: show loading state on button/disable input
  generatedReply,     // string: the AI-generated text to display
  error,              // string: error message to display
  onUseReply          // function: to pass the generatedReply to the parent for use
}) => {
  return (
    // Use a Card for better visual grouping
    <Card className="mt-3 bg-light border shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3 h6">Generate Reply with AI</Card.Title>

        {/* Display AI-specific errors */}
        {error && <Alert variant="danger" className="mt-2 py-1 px-2 small">{error}</Alert>}

        <Form.Group controlId="aiPromptTextArea" className="mb-2">
          <Form.Label className="small mb-1">Your Instruction/Prompt for AI:</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="e.g., Write a polite refusal based on the last message."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading} // Disable input while loading
            className="bg-white form-control-sm" // Smaller text area
          />
        </Form.Group>

        {/* Generate Button with Loading State */}
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={isLoading || !prompt.trim()} // Disable if loading or prompt is empty/whitespace
          size="sm"
          className="me-2"
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

        {/* Display Generated Reply if available and not loading */}
        {generatedReply && !isLoading && (
          <Card className="mt-3 bg-white border-success">
             <Card.Header as="h6" className="py-1 px-2 bg-success text-white small">Suggested Reply:</Card.Header>
            <Card.Body className="p-2">
              {/* Use pre-wrap to maintain formatting */}
              <pre className="mb-2 small" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {generatedReply}
              </pre>
              {/* Button to use the suggestion */}
              <Button
                variant="success"
                size="sm"
                className="mt-1"
                onClick={() => onUseReply(generatedReply)} // Call parent handler with the text
              >
                Use this Reply
              </Button>
            </Card.Body>
          </Card>
        )}
      </Card.Body>
    </Card>
  );
};

export default AiReplyBox;