import React from "react";
import { Routes, Route } from "react-router-dom";
import NavigationBar from "./navigationBar";
import CreateBill from "./Bill/createBill"; // Correct path
import StudReg from "./newReg/studReg"; // Correct path

function App() {
  return (
    <>
      <NavigationBar />
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/newReg/studReg" element={<StudReg />} />
        <Route path="/bill/createBill" element={<CreateBill />} />
        <Route path="/classes" element={<div>Classes</div>} />
        <Route path="/reports" element={<div>Reports</div>} />
      </Routes>
    </>
  );
}

export default App;
