import { Routes, Route } from "react-router-dom";
import NavigationBar from "./navigationBar";
import CreateBill from "./Bill/createBill"; // Correct path
import StudReg from "./newReg/studReg"; // Correct path
import { ChatLayout } from "./chat/chat_layout";

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
      </Routes>
    </>
  );
}

export default App;
