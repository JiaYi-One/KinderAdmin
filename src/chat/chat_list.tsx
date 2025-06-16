"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search } from "lucide-react"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../firebase"
import { ChatService, Chat as ChatType } from "./chat_service"

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
    const fetchChatsForStaff = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      try {
        // 1. Find staff document by teacherEmail
        const staffQuery = query(collection(db, "staff"), where("teacherEmail", "==", user.email));
        const staffSnapshot = await getDocs(staffQuery);
        
        if (!staffSnapshot.empty) {
          const staffDoc = staffSnapshot.docs[0];
          const staffData = staffDoc.data();
          const teacherID = staffData.teacherID;

          // 2. Query chats collection for all chats where teacherId matches
          const chatsQuery = query(
            collection(db, "chats"),
            where("teacherId", "==", teacherID),
            orderBy("lastMessageTime", "desc")
          );
          
          const chatsSnapshot = await getDocs(chatsQuery);
          
          const formatChatTime = (date: Date) => {
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours < 24) {
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            } else {
              return date.toISOString().slice(0, 10);
            }
          };

          const chatList: Chat[] = chatsSnapshot.docs.map(doc => {
            const data = doc.data();
            let time = '';
            if (data.lastMessageTime && data.lastMessageTime.toDate) {
              time = formatChatTime(data.lastMessageTime.toDate());
            }
            return {
              id: doc.id,
              name: `${data.studentName} (${data.parentName})`,
              lastMessage: data.lastMessage || 'No messages yet',
              time,
              unread: data.unread || 0
            };
          });
          
          setChats(chatList);
        } else {
          console.log("No staff document found for current user");
          setChats([]);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        setChats([]);
      }
    };

    fetchChatsForStaff();
  }, []);

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`, { replace: true })
  }

  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="border-end d-flex flex-column position-relative" style={{ width: '350px', height: '100%' }}>
      <div className="p-3 border-bottom bg-white">
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

      <div className="flex-grow-1 overflow-auto position-relative" style={{ marginRight: '1px',marginLeft: '1px',borderRadius: '10px' }}>
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
  const [existingChats, setExistingChats] = useState<ChatType[]>([]);

  useEffect(() => {
    async function fetchClasses() {
      const classSnap = await getDocs(collection(db, "classes"));
      setClasses(classSnap.docs.map((doc) => doc.id));
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    // Subscribe to existing chats to check for duplicates
    const unsubscribe = ChatService.subscribeToChats((chats) => {
      setExistingChats(chats);
    });
    return () => unsubscribe();
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

  const handleStartChat = async (parentId: string, studentName: string, parentName: string) => {
    try {
      // Check if a chat already exists for this student
      const existingChat = existingChats.find(
        chat => chat.parentId === parentId && chat.studentName === studentName
      );

      if (existingChat) {
        // If chat exists, navigate to it
        onStartChat(existingChat.id, studentName, parentName);
      } else {
        // If no chat exists, create a new one
        const chatId = await ChatService.createChat(parentId, studentName, parentName);
        onStartChat(chatId, studentName, parentName);
      }
    } catch (error) {
      console.error("Error handling chat:", error);
      // You might want to show an error message to the user here
    }
  };

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
                onClick={() => handleStartChat(student.parentId, student.name, student.parentName)}
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