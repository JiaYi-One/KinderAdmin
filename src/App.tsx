import { Routes, Route } from "react-router-dom";
import NavigationBar from "./navigationBar";
import CreateBill from "./Bill/createBill";
import StudReg from "./newReg/studReg";
import { ChatLayout } from "./chat/chat_layout";
import ParentList from "./parent/parentList";
import TeachersList from "./teachers/teachersList";

function App() {
  return (
    <>
      <NavigationBar />
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/newReg/studReg" element={<StudReg />} />
        <Route path="/bill/createBill" element={<CreateBill />} />
        <Route path="/classes" element={<div>Classes</div>} />
        <Route path="/chat/*" element={<ChatLayout />} />
        <Route path="/parent/parentList" element={<ParentList />} />
        <Route path="/teachers/teachersList" element={<TeachersList />} />

      </Routes>
    </>
  );
}

export default App;
