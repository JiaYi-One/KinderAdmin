"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search } from "lucide-react"
import { getAuth } from "firebase/auth"
import {  collection, query, where, getDocs,  } from "firebase/firestore"
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
    const subscribeToChatsForStaff = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Find staff document by teacherEmail
        const staffQuery = query(collection(db, "staff"), where("teacherEmail", "==", user.email));
        const staffSnapshot = await getDocs(staffQuery);
        
        if (!staffSnapshot.empty) {
          // 2. Subscribe to real-time chat updates (already filtered by current teacher in ChatService)
          const unsubscribe = ChatService.subscribeToChats((chats: ChatType[]) => {
            // Chats are already filtered for current teacher at the database level
            const teacherChats = chats;

            // Group by parentId to unify multiple children under the same parent
            type Group = {
              parentId: string;
              parentName: string;
              childNames: Set<string>;
              latestChat: ChatType | null;
              unreadSum: number;
            };

            const groups = new Map<string, Group>();

            for (const chat of teacherChats) {
              if (!groups.has(chat.parentId)) {
                groups.set(chat.parentId, {
                  parentId: chat.parentId,
                  parentName: chat.parentName,
                  childNames: new Set<string>(),
                  latestChat: null,
                  unreadSum: 0,
                });
              }
              const g = groups.get(chat.parentId)!;
              
              // Use childNames from chat document if available, otherwise fall back to studentName
              if (chat.childNames && chat.childNames.length > 0) {
                chat.childNames.forEach(childName => g.childNames.add(childName));
              } else if (chat.studentName) {
                g.childNames.add(chat.studentName);
              }
              
              g.unreadSum += chat.unreadWeb || 0;
              if (!g.latestChat || (chat.lastMessageTime && g.latestChat.lastMessageTime && chat.lastMessageTime > g.latestChat.lastMessageTime) || (!g.latestChat?.lastMessageTime && chat.lastMessageTime)) {
                g.latestChat = chat;
              }
            }

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

            const chatList: Chat[] = Array.from(groups.values()).map(group => {
              const latest = group.latestChat!;
              let time = '';
              if (latest?.lastMessageTime) {
                time = formatChatTime(latest.lastMessageTime);
              }

              // Format last message based on type (similar to Flutter app)
              let displayMessage = latest?.lastMessage || 'No messages yet';
              if (latest?.lastMessageType === 'image' || (latest?.lastMessage && isImageUrl(latest.lastMessage))) {
                displayMessage = '[Image]';
              }

              const children = Array.from(group.childNames).join(', ');

              return {
                // Use latest chat id for navigation
                id: latest?.id || group.parentId,
                name: `${group.parentName}${children ? ' - ' + children : ''}`,
                lastMessage: displayMessage,
                time,
                unread: group.unreadSum,
              };
            });

            setChats(chatList);
          });

          // Return cleanup function
          return unsubscribe;
        } else {
          console.log("No staff document found for current user");
          setChats([]);
        }
      } catch (error) {
        console.error("Error setting up chat subscription:", error);
        setChats([]);
      }
    };

    const unsubscribePromise = subscribeToChatsForStaff();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  const handleChatClick = async (chatId: string, unreadCount: number) => {
    // Mark chat as read when clicking to open
    if (unreadCount > 0) {
      try {
        await ChatService.markChatAsRead(chatId);
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    }
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

      <div className="flex-grow-1 overflow-auto position-relative" style={{ marginRight: '10px',marginLeft: '10px',borderRadius: '10px' }}>
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
                  onClick={() => handleChatClick(chat.id, chat.unread)}
                  style={{ 
                    cursor: 'pointer',
                    borderLeft: isActive ? '4px solid #0d6efd' : '4px solid transparent',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '';
                    }
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
      // Check if a chat already exists for this parent (regardless of student)
      // Each teacher should have only ONE chat per parent
      const existingChat = existingChats.find(
        chat => chat.parentId === parentId
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
        <div className="p-4">
          <div className="d-flex align-items-center mb-4">
            <button 
              className="btn btn-link p-0 me-3 d-flex align-items-center text-decoration-none" 
              onClick={onClose}
              style={{ color: '#6c757d' }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              <span>Back to Chat List</span>
            </button>
          </div>
          
          <div className="text-center mb-4">
            <h4 className="mb-2" style={{ color: '#212529', fontWeight: '600' }}>Select Class</h4>
            <p className="text-muted mb-0">Choose a class to start a conversation with parents</p>
          </div>

          <div className="row g-3">
            {classes.map((cls) => (
              <div key={cls} className="col-12">
                <button
                  className="btn w-100 text-start p-3 border-0 rounded-3 shadow-sm"
                  onClick={() => setSelectedClass(cls)}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e9ecef',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div 
                        className="fw-bold mb-1"
                        style={{ fontSize: '18px', color: '#495057' }}
                      >
                        Class {cls}
                      </div>
                    
                    </div>
                    <i 
                      className="bi bi-chevron-right"
                      style={{ fontSize: '16px', color: '#6c757d' }}
                    ></i>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student list */}
      {selectedClass && (
        <div className="p-4">
          <div className="d-flex align-items-center mb-4">
            <button 
              className="btn btn-link p-0 me-3 d-flex align-items-center text-decoration-none" 
              onClick={() => setSelectedClass("")}
              style={{ color: '#6c757d' }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              <span>Back to Class List</span>
            </button>
          </div>
          
          <div className="text-center mb-4">
            <h4 className="mb-2" style={{ color: '#212529', fontWeight: '600' }}>Select Student</h4>
            <p className="text-muted mb-0">Choose a student to start a conversation with their parent</p>
          </div>

          <div className="row g-3">
            {students.map((student) => (
              <div key={student.id} className="col-12">
                <button
                  className="btn w-100 text-start p-3 border-0 rounded-3 shadow-sm"
                  onClick={() => handleStartChat(student.parentId, student.name, student.parentName)}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e9ecef',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div 
                        className="fw-bold mb-1"
                        style={{ fontSize: '18px', color: '#495057' }}
                      >
                        {student.name}
                      </div>
                      <small className="text-muted">
                        Parent: {student.parentName}
                      </small>
                    </div>
                   
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}