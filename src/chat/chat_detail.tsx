import { useState, useEffect } from "react"
import { useParams, useLocation } from "react-router-dom"

type Message = {
  id: string
  content: string
  sender: string
  timestamp: string
}

// Mock data for different chats
const mockChatData = {
  "1": {
    name: "Mrs. Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    messages: [
      {
        id: "1",
        content: "Hello! How is Alex doing with the math homework?",
        sender: "Mrs. Johnson",
        timestamp: "10:30 AM",
      },
      {
        id: "2",
        content: "Hi Mrs. Johnson! Alex is doing well with the homework. He completed all the problems.",
        sender: "You",
        timestamp: "10:32 AM",
      },
      {
        id: "3",
        content: "That's great to hear! He's been showing good progress in class.",
        sender: "Mrs. Johnson",
        timestamp: "10:33 AM",
      }
    ]
  },
  "2": {
    name: "Mr. Smith",
    avatar: "/placeholder.svg?height=40&width=40",
    messages: [
      {
        id: "1",
        content: "The science project is due next Friday.",
        sender: "Mr. Smith",
        timestamp: "Yesterday",
      },
      {
        id: "2",
        content: "Thank you for the reminder. Will make sure Alex completes it on time.",
        sender: "You",
        timestamp: "Yesterday",
      }
    ]
  },
  "3": {
    name: "Mrs. Garcia",
    avatar: "/placeholder.svg?height=40&width=40",
    messages: [
      {
        id: "1",
        content: "Thank you for attending the parent-teacher conference.",
        sender: "Mrs. Garcia",
        timestamp: "2 days ago",
      },
      {
        id: "2",
        content: "It was a pleasure meeting you. Thank you for the detailed feedback.",
        sender: "You",
        timestamp: "2 days ago",
      }
    ]
  },
  "4": {
    name: "Mr. Wilson",
    avatar: "/placeholder.svg?height=40&width=40",
    messages: [
      {
        id: "1",
        content: "Emma has been doing great in PE class!",
        sender: "Mr. Wilson",
        timestamp: "3 days ago",
      },
      {
        id: "2",
        content: "That's wonderful to hear! She really enjoys physical activities.",
        sender: "You",
        timestamp: "3 days ago",
      }
    ]
  }
}

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

    // Check if this is an existing chat in our mock data
    const chatData = mockChatData[id as keyof typeof mockChatData]
    
    if (chatData) {
      // This is an existing chat
      setChatInfo({
        name: chatData.name,
        avatar: chatData.avatar,
        studentName: "", // Not available in mock
        parentName: chatData.name,
      })
      setMessages(chatData.messages)
    } else {
      // This is a new chat, use location state if available
      setChatInfo({
        name: "",
        avatar: "",
        studentName: location.state?.studentName || "",
        parentName: location.state?.parentName || id,
      })
      // For new chats, start with empty messages array
      setMessages([])
    }
  }, [id, location.state])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "You",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([...messages, message])
    setNewMessage("")
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
                    {message.timestamp}
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