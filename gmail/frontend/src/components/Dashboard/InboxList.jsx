import { ListGroup } from 'react-bootstrap';
import { FaEnvelope } from 'react-icons/fa';

const InboxList = ({ emails, onEmailClick, userEmail }) => {
  return (
    <ListGroup className="inbox-list">
      {emails.map((email) => (
        <ListGroup.Item
          key={email.conversationId}
          action
          onClick={() => onEmailClick(email.conversationId)}
          className="email-list-item"
        >
          <div className="email-list-item-top">
            <FaEnvelope className="email-icon" />
            <strong className="email-from">From:</strong>{' '}
            {email.participants.filter((p) => p !== userEmail).join(', ')}
          </div>
          <div className="email-list-item-subject">
            <strong>Subject:</strong> {email.messages[0]?.subject || 'No subject'}
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default InboxList;
