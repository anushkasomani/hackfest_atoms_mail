import { ListGroup, Button } from 'react-bootstrap';

const ConversationDetail = ({ conversation, onReplyClick }) => (
  <div className="mt-4">
    <h4>Conversation Details</h4>
    <ListGroup>
      {conversation.messages.map((message, idx) => (
        <ListGroup.Item key={idx} className="bg-secondary text-light mb-2">
          <div><strong>From:</strong> {message.sender}</div>
          <div><strong>To:</strong> {message.receiver}</div>
          <div><strong>Subject:</strong> {message.subject}</div>
          <div><strong>Message:</strong> {message.body}</div>
          {message.attachment && message.attachment.length > 0 && (
            <div>
              <strong>Attachments:</strong>
              <ul>
                {message.attachment.map((link, index) => (
                  <li key={index}>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-light">
                      Attachment {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <Button variant="success" className="mt-3" onClick={onReplyClick}>
      Reply
    </Button>
  </div>
);

export default ConversationDetail;