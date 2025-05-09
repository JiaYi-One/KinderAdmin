"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"

type Chat = {
  id: string
  name: string
  lastMessage: string
  time: string
  unread: number
}

export function ChatList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [chats, setChats] = useState<Chat[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    // Mock data for now - can be replaced with API call later
    setChats([
      {
        id: "1",
        name: "Mrs. Johnson",
        lastMessage: "How is Alex doing with the math homework?",
        time: "10:30 AM",
        unread: 2,
      },
      {
        id: "2",
        name: "Mr. Smith",
        lastMessage: "The science project is due next Friday.",
        time: "Yesterday",
        unread: 0,
      },
      {
        id: "3",
        name: "Mrs. Garcia",
        lastMessage: "Thank you for attending the parent-teacher conference.",
        time: "2 days ago",
        unread: 0,
      },
      {
        id: "4",
        name: "Mr. Wilson",
        lastMessage: "Emma has been doing great in PE class!",
        time: "3 days ago",
        unread: 0,
      },
    ])
  }, [])

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`, { replace: true })
  }

  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="border-end d-flex flex-column h-100" style={{ width: '350px', height: '100vh', marginLeft: '1rem' }}>
      <div className="p-3 border-bottom">
        <div className="position-relative">
          <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ width: '16px', height: '16px' }} />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            disabled={showNewChat}
          />
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto" style={{ marginRight: '1rem' }}>
        {showNewChat ? (
          <div className="p-3">
            <NewChatSelector
              onStartChat={(parentId, studentName, parentName) => {
                navigate(`/chat/${parentId}`, { 
                  replace: true,
                  state: { studentName, parentName }
                });
              }}
              onClose={() => setShowNewChat(false)}
            />
          </div>
        ) : (
          filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const isActive = location.pathname === `/chat/${chat.id}`
              return (
                <div
                  key={chat.id}
                  className={`list-group-item list-group-item-action py-3 ${
                    isActive ? 'active bg-primary text-white' : ''
                  }`}
                  onClick={() => handleChatClick(chat.id)}
                  style={{ 
                    cursor: 'pointer',
                    borderLeft: isActive ? '4px solid #0d6efd' : '4px solid transparent',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-baseline">
                    <h6 className="mb-0">
                      {chat.name}
                    </h6>
                    <small className={isActive ? 'text-white-50' : 'text-muted'}>{chat.time}</small>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <p className={`mb-0 text-truncate ${isActive ? 'text-white-50' : 'text-muted'}`}>
                      {chat.lastMessage}
                    </p>
                    {chat.unread > 0 && (
                      <span className={`badge ${isActive ? 'bg-white text-primary' : 'bg-primary'} rounded-pill ms-2`}>
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="list-group-item text-center text-muted">No conversations found</div>
          )
        )}
      </div>

      {!showNewChat && (
        <div className="p-3 border-top bg-light flex-shrink-0">
          <button className="btn btn-outline-primary w-100" onClick={() => setShowNewChat(true)}>
            New Conversation
          </button>
        </div>
      )}
    </div>
  )
}

export function NewChatSelector({
  onStartChat,
  onClose,
}: {
  onStartChat: (parentId: string, studentName: string, parentName: string) => void;
  onClose: () => void;
}) {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<{
    id: string;
    name: string;
    parentName: string;
    parentId: string;
  }[]>([]);

  useEffect(() => {
    async function fetchClasses() {
      const classSnap = await getDocs(collection(db, "classes"));
      setClasses(classSnap.docs.map((doc) => doc.id));
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    async function fetchStudents() {
      const studentsSnap = await getDocs(collection(db, "classes", selectedClass, "students"));
      setStudents(
        studentsSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          parentName: doc.data().parentName,
          parentId: doc.data().parentId,
        }))
      );
    }
    fetchStudents();
  }, [selectedClass]);

  return (
    <div>
      {/* Class list */}
      {!selectedClass && (
        <div>
          <button className="btn btn-link mb-2 px-0" onClick={onClose}>
            &larr; Back to Chat List
          </button>
          <div className="mb-2 fw-bold">Select Class</div>
          <div className="d-flex flex-column gap-2">
            {classes.map((cls) => (
              <button
                key={cls}
                className="btn btn-outline-primary text-start"
                onClick={() => setSelectedClass(cls)}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student list */}
      {selectedClass && (
        <div>
          <button className="btn btn-link px-0 mb-2" onClick={() => setSelectedClass("")}>
            &larr; Back to Class List
          </button>
          <div className="mb-2 fw-bold">Select Student</div>
          <div className="d-flex flex-column gap-2">
            {students.map((student) => (
              <button
                key={student.id}
                className="btn btn-outline-secondary text-start"
                onClick={() => onStartChat(student.parentId, student.name, student.parentName)}
              >
                {student.name} ({student.parentName})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}