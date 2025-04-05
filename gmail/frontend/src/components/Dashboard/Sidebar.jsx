import { ListGroup, Button } from 'react-bootstrap';
import './Dashboard.css';
const Sidebar = ({ onCompose }) => (
  <div className="sidebar bg-dark text-light vh-100 p-3">
    <h4 className="text-center mb-4">Menu</h4>
    <ListGroup variant="flush">
      <ListGroup.Item action href="#inbox" className="sidebar-item">
        Inbox
      </ListGroup.Item>
    </ListGroup>
    <Button variant="primary" className="mt-4 w-100 compose-button" onClick={onCompose}>
      Compose
    </Button>
  </div>
);

export default Sidebar;
