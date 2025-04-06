import { useState,useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button, ListGroup } from "react-bootstrap";
import { setCredentials } from "../../slices/authSlice";
const Sidebar = ({ onCompose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const dispatch = useDispatch();
  
  // Defensive selector: check if state.user exists
  const userInfo = useSelector((state) => state.user?.userInfo || {});

  useEffect(() => {
    if (userInfo.email) {
      setEmail(userInfo.email);
    }
    if (userInfo.name) {
      setName(userInfo.name);
    }
  }, [userInfo.email]);

  return (
    <div className="sidebar d-flex flex-column justify-content-between">
      <div>
        {/* User Info Section */}
        <div className="sidebar-user-info">
          <h5 className="mb-0 color-white">{name || ''}</h5>
          <span className="text-muted">
            {email || ''}
          </span>
        </div>

        {/* Navigation */}
        <ListGroup variant="flush" className="mt-4">
          <ListGroup.Item action href="#inbox" className="sidebar-item">
            Inbox
          </ListGroup.Item>
        </ListGroup>
      </div>

      {/* Compose Button styled like the sidebar item */}
      <Button 
        className="compose-button sidebar-item" 
        onClick={onCompose}
      >
        Compose
      </Button>
    </div>
  );
};
export default Sidebar;