import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { ChatService, Message } from "./chat_service"
import FileUpload from "../uploadImage"
import "./chat_detail.css"

export function ChatDetail() {
  const { id } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [, setIsSending] = useState(false)
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [, setProcessedMessages] = useState<Set<string>>(new Set()) // Used to track which messages we've already processed for loading states
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [fullScreenVideo, setFullScreenVideo] = useState<{url: string, fileName: string} | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const lastSentContentRef = useRef<string>("")
  const lastSentAtRef = useRef<number>(0)
  const inFlightContentRef = useRef<string>("")
  const [chatInfo, setChatInfo] = useState({
    name: "",
    avatar: "",
    studentName: "",
    parentName: "",
    webUser: "", // Add webUser to track who sent messages from web
    teacherName: "", // Add teacherName to store current teacher's name
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottomImmediate = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  // Helper function to detect if a message contains an image URL
  const isImageUrl = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    
    // Check if it's a Cloudinary URL (which the mobile app uses)
    if (content.includes('res.cloudinary.com') && content.includes('/image/upload/')) {
      return true;
    }
    
    // Check for common image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => content.toLowerCase().includes(ext));
  }

  useEffect(() => {
    if (!id) return

    // Reset loading states when chat changes
    setLoadingImages(new Set())
    setProcessedMessages(new Set())

    // Mark chat as read when opening
    const markAsRead = async () => {
      try {
        // Mark the current chat as read
        await ChatService.markChatAsRead(id)

        // Also mark other chats from the same parent as read to keep unified entry consistent
        const unsubscribeOnce = ChatService.subscribeToChats(async (chats) => {
          const selected = chats.find(c => c.id === id)
          if (!selected) return
          const siblings = chats.filter(c => c.parentId === selected.parentId && c.id !== id)
          for (const s of siblings) {
            try { await ChatService.markChatAsRead(s.id) } catch { /* empty */ }
          }
          // unsubscribe after one run
          unsubscribeOnce()
        })
      } catch (error) {
        console.error('Error marking chat as read:', error)
      }
    }
    markAsRead()

    // Subscribe to messages for this chat
    const unsubscribe = ChatService.subscribeToMessages(id, (updatedMessages) => {
      setMessages(updatedMessages)
      
      // Set loading state for truly new image messages (not previously processed)
      setProcessedMessages(prevProcessed => {
        setLoadingImages(prevLoading => {
          const newLoading = new Set(prevLoading);
          
          updatedMessages.forEach(msg => {
            // Only add to loading if it's an image message and we haven't processed it before
            if ((msg.type === 'image' || isImageUrl(msg.content)) && !prevProcessed.has(msg.id)) {
              newLoading.add(msg.id);
            }
          });
          
          return newLoading;
        });
        
        // Update processed messages to include all current messages
        const newProcessed = new Set(prevProcessed);
        updatedMessages.forEach(msg => newProcessed.add(msg.id));
        return newProcessed;
      });
      
      // Scroll to bottom instantly after messages are loaded
      requestAnimationFrame(() => scrollToBottomImmediate())
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [id])

  // Scroll to bottom when component mounts or when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        scrollToBottomImmediate()
      })
    }
  }, [messages.length])

  // Scroll to bottom immediately when component mounts
  useEffect(() => {
    // Scroll immediately on mount, even before messages load
    requestAnimationFrame(() => {
      scrollToBottomImmediate()
    })
  }, [id])

  // Handle ESC key for closing full-screen image/video and menus
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (fullScreenImage) {
          setFullScreenImage(null);
        } else if (fullScreenVideo) {
          setFullScreenVideo(null);
        } else if (openMenuId) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [fullScreenImage, fullScreenVideo, openMenuId]);

  // Handle clicking anywhere to close menu
  useEffect(() => {
    const handleClickAnywhere = (event: MouseEvent) => {
      if (openMenuId) {
        const target = event.target as Element;
        // Only close if not clicking on the delete button itself
        if (!target.closest('.floating-delete-btn')) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickAnywhere);
    return () => document.removeEventListener('mousedown', handleClickAnywhere);
  }, [openMenuId]);

  useEffect(() => {
    if (!id) return

    // Subscribe to chat updates to get chat info
    const unsubscribe = ChatService.subscribeToChats((chats) => {
      const selected = chats.find(chat => chat.id === id)
      if (!selected) return

      // Use childNames from the chat document if available, otherwise fall back to studentName
      const childNames = selected.childNames && selected.childNames.length > 0 
        ? selected.childNames 
        : selected.studentName ? [selected.studentName] : [];

      setChatInfo({
        name: selected.parentName,
        avatar: selected.image || "",
        studentName: childNames.join(', '),
        parentName: selected.parentName,
        webUser: selected.webUser,
        teacherName: selected.teacherName,
      })
    })

    return () => unsubscribe()
  }, [id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !id) return

    try {
      const messageToSend = newMessage.trim()
      // Prevent duplicate submissions of the same content
      const now = Date.now()
      if (inFlightContentRef.current === messageToSend) return
      if (
        lastSentContentRef.current === messageToSend &&
        now - lastSentAtRef.current < 2000
      ) {
        return
      }

      setIsSending(true)
      inFlightContentRef.current = messageToSend
      // Optimistically clear input so it doesn't linger while sending
      setNewMessage("")

      await ChatService.sendMessage(id, {
        content: messageToSend,
        sender: chatInfo.teacherName, // Use actual teacher name instead of hardcoded "ADMIN"
        studentName: chatInfo.studentName,
        parentName: chatInfo.parentName,
        webUser: chatInfo.webUser,
        teacherName: chatInfo.teacherName,
        type: 'text', // Add message type for text messages
      })
      lastSentContentRef.current = messageToSend
      lastSentAtRef.current = now
      // Scroll to bottom instantly after sending message
      requestAnimationFrame(() => scrollToBottomImmediate())
    } catch (error) {
      console.error("Error sending message:", error)
      // Restore input so user doesn't lose the message on error
      setNewMessage((prev) => prev || newMessage)
      // You might want to show an error message to the user here
    } finally {
      setIsSending(false)
      inFlightContentRef.current = ""
    }
  }

  const handleFileUpload = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    if (!id) return

    console.log('handleFileUpload called with:', { fileUrl, fileName, fileSize, fileType })

    try {
      setIsUploadingFile(true)
      
      // Handle both image and video uploads
      if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
        alert('Only image and video files are allowed in chat.');
        return;
      }

      const messageType = fileType.startsWith('video/') ? 'video' : 'image';
      
      const serviceMethod = fileType.startsWith('video/') ? ChatService.sendVideoMessage : ChatService.sendFileMessage;

      console.log('Sending message with type:', messageType)
      console.log('Chat info:', chatInfo)

      // Check if chat info is available
      if (!chatInfo.teacherName || !chatInfo.studentName || !chatInfo.parentName) {
        console.error('Missing chat info:', chatInfo);
        alert('Chat information not available. Please refresh the page and try again.');
        return;
      }

      await serviceMethod(id, {
        content: fileUrl,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        sender: chatInfo.teacherName,
        studentName: chatInfo.studentName,
        parentName: chatInfo.parentName,
        webUser: chatInfo.webUser,
        teacherName: chatInfo.teacherName,
        type: messageType,
      })

      console.log('File message sent successfully')
      // Scroll to bottom after sending file
      requestAnimationFrame(() => scrollToBottomImmediate())
    } catch (error) {
      console.error("Error sending file message:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      alert(`Failed to send file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!id) return;

    const confirmed = window.confirm('Are you sure you want to delete this message? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await ChatService.deleteMessage(id, messageId);
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleMenuToggle = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === messageId ? null : messageId);
  };

  if (!id) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light">
        <div className="text-center">
          <h3 className="text-muted mb-3">Select a conversation</h3>
          <p className="text-muted">Click on a chat from the list to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column h-100 position-relative">
      {/* Header - fixed */}
      <div className="p-3 border-bottom bg-light d-flex align-items-center flex-shrink-0">
        <div>
          <h5 className="mb-0">
            {chatInfo.parentName}
            {chatInfo.studentName && <span className="text-muted"> - {chatInfo.studentName}</span>}
          </h5>
        </div>
      </div>

      {/* Scrollable messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-grow-1 overflow-auto px-3 py-2 bg-white position-relative"
        style={{ scrollBehavior: 'auto' }}
      >
        {messages.length > 0 ? (
          <>
            {messages.map((message) => {
              // Check if message was sent by web user (teacher/admin) vs mobile user (parent)
              const isWebUser = message.webUser === chatInfo.webUser;
              const displayName = isWebUser
                ? (message.sender || chatInfo.teacherName || 'Teacher')
                : (message.parentName || chatInfo.parentName || 'Parent');
              const displayInitial = (displayName || '?').charAt(0).toUpperCase();
              return (
                <div
                  key={message.id}
                  className={`d-flex mb-3 ${isWebUser ? 'justify-content-end' : 'justify-content-start'} position-relative message-menu-container`}
                >
                  {!isWebUser && (
                    <div className="me-2 flex-shrink-0">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <span className="text-white">{displayInitial}</span>
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`p-3 rounded-3 ${isWebUser ? 'bg-primary text-white' : 'bg-light'} position-relative`}
                    style={{ maxWidth: '70%' }}
                  >
                    {/* Show sender name for all messages */}
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <small className={`${isWebUser ? 'text-white-50' : 'text-muted'}`}>{displayName}</small>
                      
                      {/* Menu button - always show for web user messages */}
                      {isWebUser && (
                        <div className="message-menu-button-inline">
                          <button
                            className="btn btn-sm btn-outline-secondary message-menu-toggle"
                            onClick={(e) => handleMenuToggle(message.id, e)}
                            title="Message options"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                        </div>
                      )}
                      
                    </div>
                    
                    {/* Display image or text based on message type */}
                    {(message.type === 'image' || isImageUrl(message.content)) ? (
                      <div className="chat-image-container">
                        {loadingImages.has(message.id) && (
                          <div className="chat-image-loading">
                            <div className="spinner-border spinner-border-sm text-muted" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        )}
                        <img 
                          src={message.content} 
                          alt="Chat image" 
                          className="chat-image"
                          style={{ display: loadingImages.has(message.id) ? 'none' : 'block', maxHeight: '30vh',
                            maxWidth: '30vw' } } 
                          onClick={() => {
                            // Open image in full screen modal
                            setFullScreenImage(message.content);
                          }}
                          onLoad={() => {
                            // Image loaded successfully - only update if it was loading
                            setLoadingImages(prev => {
                              if (prev.has(message.id)) {
                                const newSet = new Set(prev);
                                newSet.delete(message.id);
                                return newSet;
                              }
                              return prev;
                            });
                          }}
                          onError={(e) => {
                            // Handle image load error - only update if it was loading
                            setLoadingImages(prev => {
                              if (prev.has(message.id)) {
                                const newSet = new Set(prev);
                                newSet.delete(message.id);
                                return newSet;
                              }
                              return prev;
                            });
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'chat-image-error';
                            errorDiv.innerHTML = '<i class="fas fa-image me-2"></i>Image failed to load';
                            target.parentNode?.appendChild(errorDiv);
                          }}
                          title="Click to view full size"
                        />
                     
                      </div>
                    ) : message.type === 'video' ? (
                      <div className="chat-video-container">
                        <div 
                          className="video-thumbnail"
                          onClick={() => {
                            setFullScreenVideo({
                              url: message.content,
                              fileName: message.fileName || ''
                            });
                          }}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            minHeight: '200px',
                            minWidth: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: `url(${message.content})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <div className="video-overlay">
                            <i className="bi bi-play-circle" style={{ fontSize: '3rem', color: 'white' }}></i>
                          </div>
                        </div>
                      </div>
                    ) : message.type === 'pdf' ? (
                      <div className="chat-file-container">
                        <div className="d-flex align-items-center p-2 border rounded bg-light">
                          <i className="bi bi-file-pdf text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                          <div className="flex-grow-1">
                            <div className="fw-bold">{message.fileName || 'PDF Document'}</div>
                            <small className="text-muted">
                              {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                            </small>
                          </div>
                          <a 
                            href={message.content} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-download me-1"></i>View
                          </a>
                        </div>
                      </div>
                    ) : message.type === 'word' ? (
                      <div className="chat-file-container">
                        <div className="d-flex align-items-center p-2 border rounded bg-light">
                          <i className="bi bi-file-word text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
                          <div className="flex-grow-1">
                            <div className="fw-bold">{message.fileName || 'Word Document'}</div>
                            <small className="text-muted">
                              {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                            </small>
                          </div>
                          <a 
                            href={message.content} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-download me-1"></i>Download
                          </a>
                        </div>
                      </div>
                    ) : message.type === 'file' ? (
                      <div className="chat-file-container">
                        <div className="d-flex align-items-center p-2 border rounded bg-light">
                          <i className="bi bi-file-earmark text-secondary me-2" style={{ fontSize: '1.5rem' }}></i>
                          <div className="flex-grow-1">
                            <div className="fw-bold">{message.fileName || 'File'}</div>
                            <small className="text-muted">
                              {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                            </small>
                          </div>
                          <a 
                            href={message.content} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-download me-1"></i>Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-0">{message.content}</p>
                    )}
                    
                    <small className={`mt-1 d-block ${isWebUser ? 'text-white-50' : 'text-muted'}`}>
                      {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                  {isWebUser && (
                    <div className="ms-2 flex-shrink-0">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <span className="text-white">{displayInitial}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Floating delete button - only show when menu is clicked */}
                  {isWebUser && openMenuId === message.id && (
                    <div className="floating-delete-button">
                      <button
                        className="btn btn-sm btn-danger floating-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(message.id);
                        }}
                        title="Delete message"
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Message Input - always at the bottom */}
      <div className="p-3 border-top bg-white flex-shrink-0">
        <form onSubmit={handleSendMessage} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            autoFocus
          />
                     <FileUpload 
             onFileUpload={handleFileUpload}
             acceptedTypes={['.png', '.jpg', '.jpeg', '.mp4', '.mov', '.avi', '.webm']}
             maxSize={50}
             allowVideos={true}
             className="flex-shrink-0"
             disabled={isUploadingFile}
           />
          <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
            Send
          </button>
        </form>
      </div>
      
      {/* Full-screen image modal */}
      {fullScreenImage && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fullscreen-image-modal"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 1050 
          }}
          onClick={() => setFullScreenImage(null)}
        >
          <div className="position-relative">
            <button
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={() => setFullScreenImage(null)}
              style={{ zIndex: 1051 }}
            />
            <img
              src={fullScreenImage}
              alt="Full screen image"
              className="img-fluid" style={{ maxHeight: '90vh', maxWidth: '90vw' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Full-screen video modal */}
      {fullScreenVideo && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fullscreen-video-modal"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 1050 
          }}
          onClick={() => setFullScreenVideo(null)}
        >
          <div className="position-relative w-100 h-100 d-flex flex-column">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center p-3 text-white">
              <h5 className="mb-0">{fullScreenVideo.fileName}</h5>
              <button
                className="btn-close btn-close-white"
                onClick={() => setFullScreenVideo(null)}
                style={{ zIndex: 1051 }}
              />
            </div>
            
            {/* Video Player */}
            <div className="flex-grow-1 d-flex align-items-center justify-content-center p-3">
              <video
                src={fullScreenVideo.url}
                controls
                autoPlay
                style={{ 
                  maxHeight: '80vh', 
                  maxWidth: '90vw',
                  borderRadius: '8px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}