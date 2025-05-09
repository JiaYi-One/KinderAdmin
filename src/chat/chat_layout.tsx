import { Routes, Route } from "react-router-dom"
import { ChatList } from "./chat_list"
import { ChatDetail } from "./chat_detail"

export function ChatLayout() {
  return (
    <div className="d-flex" style={{ height: 'calc(100vh - 70px)' }}>
      <ChatList />
      <div className="flex-grow-1 d-flex flex-column" style={{ height: 'calc(100vh - 70px)' }}>
        <Routes>
          
          <Route path=":id" element={<ChatDetail />} />
          <Route path="chat_list" element={
            <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light">
              <div className="text-center">
                <h3 className="text-muted mb-3">Select a conversation</h3>
                <p className="text-muted">Click on a chat from the list to start messaging</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  )
} 