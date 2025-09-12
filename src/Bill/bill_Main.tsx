import { useState } from "react";
import BillList from "./bill_List";
import CreateBill from "./createBill";

function BillMain() {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="container max-w-6xl">
        <main className="bg-white rounded shadow p-5">
          <div className="mb-4 d-flex align-items-center justify-content-between">
            <div>
              <h2 className="h3 fw-bold">Billing Management</h2>
              <p className="text-muted mt-1">
                Manage bills and create new ones for students and parents
              </p>
            </div>
          </div>

          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
                style={{ color: activeTab === "list" ? '#000000' : '#000000' }}
              >
                Bill List
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
                style={{ color: activeTab === "create" ? '#000000' : '#000000' }}
              >
                Create Bill
              </button>
            </li>
          </ul>

          {activeTab === "list" ? <BillList /> : <CreateBill />}
        </main>
      </div>
    </div>
  );
}

export default BillMain;


