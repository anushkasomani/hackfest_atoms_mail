import React from 'react'
import { Col } from 'react-bootstrap'
const Sidebar = () => {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const handleComposeClick = () => {
        setShowComposeModal(true);
        setError('');
        setSuccess('');
      };
  return (
   <Col md={3} className="bg-secondary vh-100 p-3">
               <h4 className="text-center">Menu</h4>
               <ListGroup variant="flush">
                 <ListGroup.Item action href="#inbox" className="bg-dark text-light border-0">
                   Inbox
                 </ListGroup.Item>
               </ListGroup>
               {/* Add Compose Button */}
               <Button 
                 variant="success" 
                 className="mt-3 w-100"
                 onClick={handleComposeClick}
               >
                 Compose
               </Button>
             </Col>
  )
}

export default Sidebar
