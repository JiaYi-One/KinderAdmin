import { Routes, Route, Navigate } from "react-router-dom";
import NavigationBar from "./navigationBar";
import CreateBill from "./Bill/createBill";
import StudReg from "./newReg/studReg";
import { ChatLayout } from "./chat/chat_layout";
import ParentList from "./parent/parentList";
import TeachersList from "./teachers/teachersList";
import Login from "./auth/login";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import AttendancePage from "./attendance/AttendanceMain";
import TakeAttendance from "./attendance/TakeAttendance";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavigationBar />
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <div>Dashboard</div> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/newReg/studReg" 
          element={isAuthenticated ? <StudReg /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/bill/createBill" 
          element={isAuthenticated ? <CreateBill /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/classes" 
          element={isAuthenticated ? <div>Classes</div> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/chat/*" 
          element={isAuthenticated ? <ChatLayout /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/parent/parentList" 
          element={isAuthenticated ? <ParentList /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/teachers/teachersList" 
          element={isAuthenticated ? <TeachersList /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/attendance/AttendanceMain" 
          element={isAuthenticated ? <AttendancePage /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/attendance/TakeAttendance" 
          element={isAuthenticated ? <TakeAttendance /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </>
  );
}

export default App;
