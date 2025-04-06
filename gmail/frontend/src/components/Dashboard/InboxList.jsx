import { ListGroup } from 'react-bootstrap';

const InboxList = ({ emails, onEmailClick, userEmail }) => (
  <ListGroup>
    {emails.map((email) => (
      <ListGroup.Item
        key={email.conversationId}
        action
        onClick={() => onEmailClick(email.conversationId)}
        className="bg-dark text-light border-0 mb-2"
      >
        <div>
          <strong>With:</strong>{' '}
          {email.participants.filter((p) => p !== userEmail).join(', ')}
        </div>
        <div>
          <strong>Subject:</strong> {email.messages[0]?.subject || 'No subject'}
        </div>
      </ListGroup.Item>
    ))}
  </ListGroup>
);

export default InboxList;
