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
  const [isUploadingFile, setIsUploadingFile] = useState(false)
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
        await ChatService.markChatAsRead(id)
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

  // Handle ESC key for closing full-screen image
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullScreenImage) {
        setFullScreenImage(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [fullScreenImage]);

  useEffect(() => {
    if (!id) return

    // Subscribe to chat updates to get chat info
    const unsubscribe = ChatService.subscribeToChats((chats) => {
      const currentChat = chats.find(chat => chat.id === id)
      if (currentChat) {
        setChatInfo({
          name: currentChat.parentName,
          avatar: currentChat.image || "",
          studentName: currentChat.studentName,
          parentName: currentChat.parentName,
          webUser: currentChat.webUser, // Store the webUser ID
          teacherName: currentChat.teacherName, // Store the teacher's name
        })
      }
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

    try {
      setIsUploadingFile(true)
      
      // Only handle image uploads
      if (!fileType.startsWith('image/')) {
        alert('Only image files are allowed in chat.');
        return;
      }

      await ChatService.sendFileMessage(id, {
        content: fileUrl,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        sender: chatInfo.teacherName,
        studentName: chatInfo.studentName,
        parentName: chatInfo.parentName,
        webUser: chatInfo.webUser,
        teacherName: chatInfo.teacherName,
        type: 'image',
      })

      // Scroll to bottom after sending file
      requestAnimationFrame(() => scrollToBottomImmediate())
    } catch (error) {
      console.error("Error sending file message:", error)
      alert('Failed to send image. Please try again.')
    } finally {
      setIsUploadingFile(false)
    }
  }

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
            {/* Show that this is a chat with the parent about their child */}
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
                  className={`d-flex mb-3 ${isWebUser ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  {!isWebUser && (
                    <div className="me-2 flex-shrink-0">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <span className="text-white">{displayInitial}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-3 ${isWebUser ? 'bg-primary text-white' : 'bg-light'}`}
                    style={{ maxWidth: '70%' }}
                  >
                    {/* Show sender name for all messages */}
                    <div className="d-flex align-items-center mb-1">
                      <small className={`${isWebUser ? 'text-white-50' : 'text-muted'}`}>{displayName}</small>
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
             acceptedTypes={['.png', '.jpg', '.jpeg']}
             maxSize={5}
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
    </div>
  )
}