import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { ChatService, Message } from "./chat_service"

export function ChatDetail() {
  const { id } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatInfo, setChatInfo] = useState({
    name: "",
    avatar: "",
    studentName: "",
    parentName: "",
    webUser: "", // Add webUser to track who sent messages from web
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }

  useEffect(() => {
    if (!id) return

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
      // Scroll to bottom instantly after messages are loaded
      requestAnimationFrame(scrollToBottom)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [id])

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
        })
      }
    })

    return () => unsubscribe()
  }, [id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !id) return

    try {
      await ChatService.sendMessage(id, {
        content: newMessage,
        sender: "Teacher 2", // Use actual teacher name instead of hardcoded "ADMIN"
        studentName: chatInfo.studentName,
        parentName: chatInfo.parentName,
        webUser: chatInfo.webUser, // Use the actual webUser ID from chat
      })
      setNewMessage("")
      // Scroll to bottom instantly after sending message
      requestAnimationFrame(scrollToBottom)
    } catch (error) {
      console.error("Error sending message:", error)
      // You might want to show an error message to the user here
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
            {chatInfo.studentName && <span>{chatInfo.studentName} </span>}
            {chatInfo.parentName && <span>({chatInfo.parentName})</span>}
            {!chatInfo.studentName && !chatInfo.parentName && chatInfo.name}
          </h5>
        </div>
      </div>

      {/* Scrollable messages area */}
      <div className="flex-grow-1 overflow-auto px-3 py-2 bg-white position-relative">
        {messages.length > 0 ? (
          <>
            {messages.map((message) => {
              // Check if message was sent by web user (teacher/admin) vs mobile user (parent)
              const isWebUser = message.webUser === chatInfo.webUser;
              return (
                <div
                  key={message.id}
                  className={`d-flex mb-3 ${isWebUser ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  {!isWebUser && (
                    <div className="me-2 flex-shrink-0">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <span className="text-white">{message.sender[0]}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-3 ${isWebUser ? 'bg-primary text-white' : 'bg-light'}`}
                    style={{ maxWidth: '70%' }}
                  >
                    {/* Show sender name for all messages */}
                    <div className="d-flex align-items-center mb-1">
                      <small className={`${isWebUser ? 'text-white-50' : 'text-muted'}`}>
                        {isWebUser ? message.sender : message.parentName}
                      </small>
                    </div>
                    <p className="mb-0">{message.content}</p>
                    <small className={`mt-1 d-block ${isWebUser ? 'text-white-50' : 'text-muted'}`}>
                      {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                  {isWebUser && (
                    <div className="ms-2 flex-shrink-0">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <span className="text-white">{message.sender[0]}</span>
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
          <button type="submit" className="btn btn-primary">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}