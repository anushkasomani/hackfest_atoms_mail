import React from 'react';
import { Form, Button, Spinner, Alert, Card, Accordion } from 'react-bootstrap'; // Ensure Accordion is imported

const AiReplyBox = ({
  prompt,
  setPrompt,
  onGenerate,
  isLoading,
  // Receive both summary and dialogues props
  generatedSummary,
  formattedDialogues,
  error,
  onUseReply // Function to take text (summary) and put it in the manual reply modal
}) => {
  return (
    // Use a Card for better visual grouping
    <Card className="mt-3 bg-light border shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3 h6">Generate Reply with AI</Card.Title>

        {/* Display AI-specific errors */}
        {error && <Alert variant="danger" className="mt-2 py-1 px-2 small">{error}</Alert>}

        {/* Prompt Input Area */}
        <Form.Group controlId="aiPromptTextArea" className="mb-2">
          <Form.Label className="small mb-1">Your Instruction/Prompt for AI:</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="e.g., Summarize attachments, suggest a reply..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="bg-white form-control-sm"
          />
        </Form.Group>

        {/* Generate Button with Loading State */}
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={isLoading || !prompt.trim()}
          size="sm"
          className="me-2"
        >
          {isLoading ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              <span className="ms-1">Generating...</span>
            </>
          ) : (
            'Generate AI Analysis' // Renamed button slightly
          )}
        </Button>

        {/* --- Display Results Section (UPDATED) --- */}
        {/* Show results section only when not loading AND either summary or dialogues exist */}
        {!isLoading && (generatedSummary || formattedDialogues) && (
          <div className="mt-3">
            {/* Use Accordion to optionally collapse sections */}
            <Accordion defaultActiveKey={generatedSummary ? "0" : "1"}> {/* Open summary first if exists */}

              {/* Attachment Summary Section */}
              {generatedSummary && ( // Conditionally render based on prop
                <Accordion.Item eventKey="0">
                  {/* Use as={Button} with variant="link" for custom look if needed */}
                  <Accordion.Header as="div" className="small py-1 px-2">
                     Attachment Summary:
                  </Accordion.Header>
                  <Accordion.Body className="p-2">
                    {/* Use pre-wrap to preserve formatting */}
                    <pre className="mb-2 small" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                      {generatedSummary}
                    </pre>
                    {/* Button to use the summary in the reply modal */}
                    <Button variant="outline-success" size="sm" className="mt-1" onClick={onUseReply}>
                      Use Summary in Reply
                    </Button>
                  </Accordion.Body>
                </Accordion.Item>
              )}

              {/* Formatted Dialogues Section */}
              {formattedDialogues && ( // Conditionally render based on prop
                <Accordion.Item eventKey="1">
                   <Accordion.Header as="div" className="small py-1 px-2">
                      Formatted Conversation Text:
                   </Accordion.Header>
                   <Accordion.Body className="p-2">
                     {/* Scrollable preformatted text block */}
                     <pre
                        className="mb-2 small"
                        style={{
                             whiteSpace: 'pre-wrap',
                             wordWrap: 'break-word',
                             maxHeight: '300px', // Limit height
                             overflowY: 'auto', // Add scrollbar
                             backgroundColor: '#f8f9fa', // Slightly different bg
                             padding: '5px',
                             border: '1px solid #dee2e6'
                         }}
                     >
                       {formattedDialogues}
                     </pre>
                     {/* No action button needed for dialogues unless you want one */}
                   </Accordion.Body>
                </Accordion.Item>
              )}

            </Accordion>
          </div>
        )}
        {/* --- End Display Results Section --- */}

      </Card.Body>
    </Card>
  );
};

export default AiReplyBox;