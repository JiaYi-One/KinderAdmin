import { useState } from "react";
import BillList from "./bill_List";
import CreateBill from "./createBill";

function BillMain() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  return (
    <div className="min-vh-100">
      <div className="container">
        <div className="bg-white rounded shadow p-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h2 className="h3 fw-bold mb-1">Billing</h2>
              <p className="text-muted mb-0">Manage bills and create new ones</p>
            </div>
          </div>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                Bill List
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                Create Bill
              </button>
            </li>
          </ul>

          {activeTab === "list" ? <BillList /> : <CreateBill />}
        </div>
      </div>
    </div>
  );
}

export default BillMain;


