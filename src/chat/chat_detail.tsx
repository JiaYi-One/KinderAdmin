import { useState, useEffect } from "react"
import { useParams, useLocation } from "react-router-dom"
import { ChatService, Message } from "./chat_service"

export function ChatDetail() {
  const { id } = useParams()
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatInfo, setChatInfo] = useState({
    name: "",
    avatar: "",
    studentName: "",
    parentName: "",
  })

  useEffect(() => {
    if (!id) return

    // Subscribe to messages for this chat
    const unsubscribe = ChatService.subscribeToMessages(id, (updatedMessages) => {
      setMessages(updatedMessages)
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
        sender: "You", // You might want to get this from your auth context
        studentName: chatInfo.studentName,
        parentName: chatInfo.parentName,
      })
      setNewMessage("")
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
    <div className="d-flex flex-column vh-100">
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
      <div className="flex-grow-1 overflow-auto px-3 py-2 bg-white">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`d-flex mb-3 ${message.sender === "You" ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className={`p-3 rounded-3 ${message.sender === "You" ? 'bg-primary text-white' : 'bg-light'}`}
                style={{ maxWidth: '70%' }}
              >
                <div className="d-flex align-items-center mb-1">
                  <small className={message.sender === "You" ? 'text-white-50' : 'text-muted'}>
                    {message.sender}
                  </small>
                  <small className={`ms-2 ${message.sender === "You" ? 'text-white-50' : 'text-muted'}`}>
                    {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
                <p className="mb-0">{message.content}</p>
              </div>
            </div>
          ))
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