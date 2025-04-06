// src/components/dashboard/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col, Modal, Alert } from 'react-bootstrap'; // Ensure Alert is imported
import axios from 'axios';

// Relative imports within the same directory (assuming .jsx)
import Sidebar from './Sidebar.jsx';
import InboxList from './InboxList.jsx';
import ConversationDetail from './ConversationDetail.jsx';
import ReplyModal from './ReplyModal.jsx';
import ComposeModal from './ComposeModal.jsx';
// AiReplyBox is used within ConversationDetail, no direct import needed here

import './Dashboard.css'; // Assuming CSS is also here or adjust path

const Dashboard = () => {
  // --- Component State ---
  const [emails, setEmails] = useState([]); // List of conversations
  const [selectedConversation, setSelectedConversation] = useState(null); // Currently viewed convo
  const [showDetailModal, setShowDetailModal] = useState(false); // Detail modal visibility
  const [showReplyModal, setShowReplyModal] = useState(false); // Manual Reply modal visibility
  const [replyMessage, setReplyMessage] = useState(''); // Content for ReplyModal
  const [showComposeModal, setShowComposeModal] = useState(false); // Compose modal visibility
  const [composeData, setComposeData] = useState({ receiver: '', subject: '', body: '' }); // Compose form data
  const [error, setError] = useState(''); // General errors (compose, manual reply, fetch list)
  const [success, setSuccess] = useState(''); // General success messages
  const [composeAttachment, setComposeAttachment] = useState(null); // File for new email
  const [replyAttachment, setReplyAttachment] = useState(null); // File for reply email
  const [isUploading, setIsUploading] = useState(false); // Cloudinary upload status

  // --- AI Related State ---
  const [showAiPrompt, setShowAiPrompt] = useState(false); // AI section visibility in Detail Modal
  const [aiPrompt, setAiPrompt] = useState(''); // User's prompt for the AI
  const [aiGeneratedSummary, setAiGeneratedSummary] = useState(''); // Summary from AI (attachments)
  const [aiFormattedDialogues, setAiFormattedDialogues] = useState(''); // Formatted text from AI/Backend
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false); // Loading state for AI call
  const [aiError, setAiError] = useState(''); // Specific errors from AI generation/backend call
  // --- End AI State ---

  // Get user info from Redux store
  const { userInfo } = useSelector((state) => state.auth);

  // --- Effects ---

  // Fetch emails on initial load or when user info changes
  useEffect(() => {
    const fetchEmails = async () => {
      if (!userInfo?.email) {
         console.log("User info not available yet for fetching emails.");
         return;
      }
      try {
        setError(''); // Clear previous general errors
        const response = await axios.get(`/api/conversations/user/${userInfo.email}`);
        setEmails(response.data);
      } catch (err) {
        console.error('Failed to fetch emails:', err);
        setError(err.response?.data?.message || 'Failed to load your inbox.');
      }
    };
    fetchEmails();
  }, [userInfo]); // Re-run if userInfo object changes

  // Reset AI state and selected conversation when the detail modal closes
  // *** THIS IS THE CORRECTED useEffect ***
  useEffect(() => {
    if (!showDetailModal) {
      // console.log("[EFFECT] Detail modal closed, resetting AI state."); // Optional debug log
      // Reset all AI-related states when modal is hidden
      setShowAiPrompt(false);
      setAiPrompt('');
      setAiGeneratedSummary(''); // Use the correct setter for summary
      setAiFormattedDialogues(''); // Also reset the dialogues state
      setIsGeneratingAiReply(false);
      setAiError('');
      setSelectedConversation(null); // Clear selection when modal closes
    }
  }, [showDetailModal]); // Dependency array is correct

  // --- Event Handlers & Functions ---

  // Handle clicking an email in the InboxList
  const handleEmailClick = async (conversationId) => {
    setError('');
    setSuccess('');
    setAiError(''); // Clear previous AI errors too
    setSelectedConversation(null); // Clear previous selection
    setShowDetailModal(true); // Show modal immediately (maybe show loading state inside)

    try {
      const response = await axios.get(`/api/conversations/${conversationId}`);
      setSelectedConversation(response.data);
      // Reset AI state for the newly selected conversation view (redundant due to useEffect above, but safe)
      setShowAiPrompt(false);
      setAiPrompt('');
      setAiGeneratedSummary('');
      setAiFormattedDialogues('');
      setIsGeneratingAiReply(false);
      setAiError('');
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
      setError(err.response?.data?.message || 'Failed to load conversation details.');
      setShowDetailModal(false); // Close modal if fetch fails
    }
  };

  // --- Cloudinary Upload Helper ---
  const uploadToCloudinary = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);
    // Ensure this upload preset exists in your Cloudinary account and allows unsigned uploads
    formData.append('upload_preset', 'check123');

    setIsUploading(true); // Set uploading state
    console.log(`[Upload] Uploading ${file.name} to Cloudinary...`);
    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/dx3y6lm0i/upload`, // Use your Cloudinary cloud name
        formData
      );
      setIsUploading(false);
      console.log(`[Upload] Success: ${response.data.secure_url}`);
      return response.data.secure_url; // Return the URL
    } catch (error) {
      console.error('[Upload] Error uploading to Cloudinary:', error);
      console.error("[Upload] Cloudinary error details:", error.response?.data);
      setIsUploading(false);
      // Throw a new error to be caught by the calling function (handleSendReply/handleSendNewEmail)
      throw new Error('Attachment upload failed. Please try again.');
    }
  };

  // --- Manual Reply Logic ---
  const handleManualReplyClick = () => {
      setError('');
      setSuccess('');
      setReplyMessage(''); // Clear previous manual message
      setReplyAttachment(null);
      setShowReplyModal(true);
      setShowAiPrompt(false); // Hide AI section if open
  };

  const handleReplyFileChange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
          setReplyAttachment(e.target.files[0]);
      } else {
          setReplyAttachment(null);
      }
  };

  const handleSendReply = async () => {
     if (!selectedConversation) { setError('No conversation selected.'); return; }
     if (!replyMessage) { setError('Reply message cannot be empty.'); return; }
     setError('');
     setSuccess('');

    try {
        // Upload attachment first (uploadToCloudinary handles null attachment)
        let attachmentUrl = await uploadToCloudinary(replyAttachment);

        const { conversationId } = selectedConversation;
        // Determine receiver based on the *last* message
        const lastMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
        // Check if sender/receiver exist on lastMessage before accessing email
        const receiverEmail = lastMessage?.sender === userInfo?.email ? lastMessage?.receiver : lastMessage?.sender;
        if (!receiverEmail) { throw new Error("Could not determine recipient for reply."); }

        // Use the subject from the first message for context
        const originalSubject = selectedConversation.messages[0]?.subject || '(No Subject)';
        const replySubject = originalSubject.toLowerCase().startsWith('re:') ? originalSubject : `Re: ${originalSubject}`;

        const replyData = {
            sender: userInfo.email,
            receiver: receiverEmail,
            subject: replySubject,
            body: replyMessage,
            attachment: attachmentUrl ? [attachmentUrl] : [], // Send as array
        };

        console.log(`[Reply] Sending reply data for ${conversationId}:`, replyData);
        await axios.post(`/api/conversations/${conversationId}/reply`, replyData);
        setSuccess('Reply sent successfully!');

        // Refresh the specific conversation in the modal for immediate feedback
         const updatedConvo = await axios.get(`/api/conversations/${conversationId}`);
         setSelectedConversation(updatedConvo.data);

        // Also refresh the main email list in the background
        const updatedEmails = await axios.get(`/api/conversations/user/${userInfo.email}`);
        setEmails(updatedEmails.data);

        // Close modal and reset state after a delay
        setTimeout(() => {
            setShowReplyModal(false);
            setReplyMessage('');
            setReplyAttachment(null);
            setSuccess('');
        }, 1500);

    } catch (err) { // Catch errors from upload or API call
        console.error('[Reply] Failed to send reply:', err);
        // Use error message from upload/API call if available, otherwise generic
        setError(err.message || err.response?.data?.message || 'Failed to send reply.');
        setIsUploading(false); // Ensure indicator stops
    }
  };

  // --- Compose New Email Logic ---
  const handleComposeFileChange = (event) => { // Changed to receive event directly
    if (event && event.target && event.target.files && event.target.files.length > 0) {
      console.log('[Compose] File selected:', event.target.files[0].name);
      setComposeAttachment(event.target.files[0]);
    } else {
      console.log('[Compose] File selection cleared or invalid event.');
      setComposeAttachment(null);
    }
  };

  const handleSendNewEmail = async () => {
    setError('');
    setSuccess('');
    if (!composeData.receiver || !composeData.subject || !composeData.body) {
      setError('Receiver, Subject, and Body are required.');
      return;
    }

    try {
      // Upload attachment first
      let attachmentUrl = await uploadToCloudinary(composeAttachment);

      const emailData = {
        sender: userInfo.email,
        receiver: composeData.receiver,
        subject: composeData.subject,
        body: composeData.body,
        attachment: attachmentUrl ? [attachmentUrl] : [], // Send as array
      };

      console.log('[Compose] Sending new email data:', emailData);
      const response = await axios.post('/api/conversations', emailData);

      if (response.status === 201) {
        setSuccess('Email sent successfully!');
        // Refresh email list
        const updatedResponse = await axios.get(`/api/conversations/user/${userInfo.email}`);
        setEmails(updatedResponse.data);
        // Reset form and close modal
        setComposeData({ receiver: '', subject: '', body: '' });
        setComposeAttachment(null);
        setTimeout(() => {
          setShowComposeModal(false);
          setSuccess('');
        }, 1500);
      }
    } catch (err) { // Catch errors from upload or API call
      console.error('[Compose] Failed to send email:', err);
      setError(err.message || err.response?.data?.message || 'Failed to send email.');
      setIsUploading(false); // Ensure indicator stops
    }
  };

  // --- AI Generation Logic (Updated Response Handling) ---
  const handleGenerateAiReply = async () => {
    if (!selectedConversation) { setAiError("No conversation selected."); return; }
    if (!aiPrompt) { setAiError("Please enter a prompt for the AI."); return; }

    setAiError('');
    setAiGeneratedSummary(''); // Clear previous summary
    setAiFormattedDialogues(''); // Clear previous dialogues
    setIsGeneratingAiReply(true);

    try {
      const { conversationId } = selectedConversation;
      const apiUrl = `/api/conversations/${conversationId}/generate`;

      console.log(`[FRONTEND AI] Calling backend: ${apiUrl} with prompt: ${aiPrompt}`);

      // Node backend calls Flask /summarize and forwards response
      const response = await axios.post(apiUrl, { prompt: aiPrompt });

      console.log('[FRONTEND AI] Received response from Node backend:', response.data);

      // Process BOTH summary and dialogues from the response
      let summaryReceived = false;
      let dialoguesReceived = false;

      if (response.data) {
          // Process Summary
          if (typeof response.data.summary === 'string') { // Check if summary is a string
              setAiGeneratedSummary(response.data.summary);
              summaryReceived = true;
              console.log(`[FRONTEND AI] Summary set.`);
          } else {
              console.warn('[FRONTEND AI] Response received, but "summary" key was missing or not a string.');
              setAiGeneratedSummary("Summary not available or format incorrect."); // Provide default
          }

          // Process Dialogues
          if (typeof response.data.dialogues === 'string') { // Check if dialogues is a string
              setAiFormattedDialogues(response.data.dialogues);
              dialoguesReceived = true;
              console.log(`[FRONTEND AI] Dialogues set.`);
          } else {
               console.warn('[FRONTEND AI] Response received, but "dialogues" key was missing or not a string.');
               setAiFormattedDialogues("Formatted conversation text not available."); // Provide default
          }
      }

      // Check if the response was fundamentally invalid
      if (!response.data || (!summaryReceived && !dialoguesReceived)) {
        console.error('[FRONTEND AI] Response format from backend seems incorrect:', response.data);
        throw new Error("AI service response format incorrect (missing summary and dialogues).");
      }

    } catch (err) { // Catch errors from axios call or the throw above
      console.error('[FRONTEND AI] Failed to generate AI reply:', err);
      // Extract error message preferrably from response, otherwise use generic message
      const errorMsg = err.response?.data?.message // Error message from Node backend's JSON response
                       || err.response?.data?.ai_service_error?.error // Error forwarded from Flask
                       || err.message // Network/Axios error message or message from the 'throw' above
                       || 'Could not get AI suggestion.'; // Generic fallback
      console.error('[FRONTEND AI] Setting AI Error state to:', errorMsg);
      setAiError(errorMsg);
      // Clear any partial results on error
      setAiGeneratedSummary('');
      setAiFormattedDialogues('');
    } finally {
      setIsGeneratingAiReply(false); // Ensure loading stops
    }
  };

  // --- Use AI Reply Logic (Using Summary) ---
  const handleUseAiReply = (summaryText) => { // Accepts summary text
    if (typeof summaryText !== 'string') {
        console.warn("handleUseAiReply called with non-string, using empty.");
        summaryText = '';
    }
    setReplyMessage(summaryText); // Populate the manual reply message state with summary
    setShowAiPrompt(false); // Hide the AI box
    setShowReplyModal(true); // Open the manual reply modal for review/sending
    // Clear AI state *after* using it
    setAiPrompt('');
    setAiGeneratedSummary('');
    setAiFormattedDialogues('');
    setAiError('');
  };


  // --- Render Logic ---
  return (
    <div className="dashboard-container">
      <Container fluid>
        <Row>
          {/* Sidebar */}
          <Col md={3} className="sidebar-container border-end">
             {/* Pass handler to open compose modal */}
            <Sidebar onCompose={() => {
                setError(''); // Clear errors when opening compose
                setSuccess('');
                setComposeData({ receiver: '', subject: '', body: '' }); // Reset form
                setComposeAttachment(null); // Reset attachment
                setShowComposeModal(true);
            }} />
          </Col>

          {/* Main Content Area */}
          <Col md={9} className="content-container p-4">
            <h2 className="inbox-title mb-3">Inbox</h2>
            {/* Display general errors (e.g., email fetch error) only when no modal is open */}
            {error && !showComposeModal && !showReplyModal && !showDetailModal &&
                <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-3">{error}</Alert>}
            {/* Inbox List */}
            <InboxList
                emails={emails}
                onEmailClick={handleEmailClick}
                userEmail={userInfo?.email || ''}
            />
          </Col>
        </Row>
      </Container>

      {/* Modal for Conversation Details (Includes AI Box) */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Conversation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Show loading state or error specific to fetching detail */}
          {!selectedConversation && !error && <p>Loading conversation...</p> }
          {/* Display fetch error within the modal if it occurs while modal is trying to show */}
          {error && showDetailModal && <Alert variant="danger">{error}</Alert>}

          {selectedConversation && (
            <ConversationDetail
              conversation={selectedConversation}
              onReplyClick={handleManualReplyClick} // Opens manual reply modal
              // --- Pass all AI state and handlers down ---
              showAiPrompt={showAiPrompt}
              onToggleAiPrompt={() => setShowAiPrompt(!showAiPrompt)}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              onGenerateAiReply={handleGenerateAiReply}
              isGeneratingAiReply={isGeneratingAiReply}
              aiGeneratedSummary={aiGeneratedSummary}     // Pass summary
              aiFormattedDialogues={aiFormattedDialogues} // Pass dialogues
              aiError={aiError}
              onUseAiReply={handleUseAiReply}          // Pass handler for "Use Summary" button
              // --- End AI props ---
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Modal for Manual/Final Reply */}
      <ReplyModal
        show={showReplyModal}
        onHide={() => { setShowReplyModal(false); setError(''); setSuccess(''); /* Clear errors on hide */ }}
        message={replyMessage}
        setMessage={setReplyMessage}
        onSend={handleSendReply}
        error={error} // Show reply/upload errors here
        success={success}
        setAttachment={handleReplyFileChange} // Use specific handler for reply file input
        isSending={isUploading} // Pass upload/sending state
      />

      {/* Modal for Composing New Email */}
      <ComposeModal
        show={showComposeModal}
        onHide={() => { setShowComposeModal(false); setError(''); setSuccess(''); /* Clear errors on hide */ }}
        formData={composeData}
        setFormData={setComposeData}
        onSend={handleSendNewEmail}
        error={error} // Show compose/upload errors here
        success={success}
        setAttachment={handleComposeFileChange} // Pass handler for compose file input
        isSending={isUploading} // Pass upload/sending state
      />
    </div>
  );
};

export default Dashboard;