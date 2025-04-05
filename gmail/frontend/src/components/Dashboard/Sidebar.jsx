import { ListGroup, Button } from 'react-bootstrap';

const Sidebar = ({ onCompose }) => (
  <div className="bg-secondary vh-100 p-3">
    <h4 className="text-center">Menu</h4>
    <ListGroup variant="flush">
      <ListGroup.Item action href="#inbox" className="bg-dark text-light border-0">
        Inbox
      </ListGroup.Item>
    </ListGroup>
    <Button variant="success" className="mt-3 w-100" onClick={onCompose}>
      Compose
    </Button>
  </div>
);

export default Sidebar;
