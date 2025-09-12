import { useEffect, useMemo, useState } from "react";
import { runDueDateReminders } from "../notifications/checkDueDateReminders";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { Receipt, Search, Filter, CheckCircle, XCircle, Clock } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";

interface Bill {
  id: string;
  billId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  studentId: string;
  studentName: string;
  classId: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  items: Array<{
    id: number;
    description: string;
    amount: number;
  }>;
  totalAmount: number;
  paymentStatus: string;
  createdAt: Date;
}

function BillList() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10; // bills per page

  // Helper function to check if a bill is overdue
  const isBillOverdue = (bill: Bill): boolean => {
    const today = new Date();
    const dueDate = new Date(bill.dueDate);
    return dueDate < today && bill.paymentStatus !== "paid";
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const billsCollection = collection(db, "bills");
      const billsSnapshot = await getDocs(query(billsCollection, orderBy("createdAt", "desc")));
      const billsList = billsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bill[];

      setBills(billsList);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBillClick = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillDetails(true);
  };

  const handleCloseDetails = () => {
    setShowBillDetails(false);
    setSelectedBill(null);
  };

  const handleStatusUpdate = async (billId: string, newStatus: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const billRef = doc(db, "bills", billId);
      await updateDoc(billRef, {
        paymentStatus: newStatus
      });

      // Update local state
      setBills(prev => prev.map(bill => 
        bill.id === billId ? { ...bill, paymentStatus: newStatus } : bill
      ));

      // Update selected bill if it's the one being updated
      if (selectedBill && selectedBill.id === billId) {
        setSelectedBill(prev => prev ? { ...prev, paymentStatus: newStatus } : null);
      }
    } catch (error) {
      console.error("Error updating bill status:", error);
      alert("Failed to update bill status");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.classId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determine the actual status for filtering
    let actualStatus = bill.paymentStatus;
    const isOverdue = isBillOverdue(bill);
    if (isOverdue) {
      actualStatus = "overdue";
    }
    
    // Handle status filtering with special logic for unpaid
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "unpaid") {
      // "Unpaid" filter should include both regular unpaid AND overdue bills
      matchesStatus = bill.paymentStatus === "unpaid" || isOverdue;
    } else if (statusFilter === "overdue") {
      // "Overdue" filter shows only overdue bills
      matchesStatus = isOverdue;
    } else {
      // Other filters (like "paid") match exactly
      matchesStatus = actualStatus === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage]);

  const getStatusBadge = (bill: Bill) => {
    // Determine the actual status to display
    let actualStatus = bill.paymentStatus;
    if (isBillOverdue(bill)) {
      actualStatus = "overdue";
    }
    
    switch (actualStatus) {
      case "paid":
        return <span className="badge bg-success"><CheckCircle size={12} className="me-1" />Paid</span>;
      case "unpaid":
        return <span className="badge bg-danger"><XCircle size={12} className="me-1" />Unpaid</span>;
      case "overdue":
        return <span className="badge bg-warning"><Clock size={12} className="me-1" />Overdue</span>;
      default:
        return <span className="badge bg-secondary">{actualStatus}</span>;
    }
  };


  if (loading) {
    return (
      <div className="min-vh-100 bg-light p-4">
        <div className="container">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 ">
      <div className="container">
        <div className="bg-white rounded shadow p-4">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="h3 fw-bold mb-1">Bill Management</h2>
              <p className="text-muted mb-0">View and manage all created bills</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-warning btn-sm d-flex align-items-center gap-2"
                disabled={sendingReminders}
                onClick={async () => {
                  try {
                    setSendingReminders(true);
                    console.log("🚀 Starting reminder process...");
                    
                    const result = await runDueDateReminders(db);
                    
                    const successMessage = result.sent > 0 
                      ? `✅ Successfully sent ${result.sent} individual bill reminder${result.sent > 1 ? 's' : ''} for ${result.candidates} unpaid bill${result.candidates > 1 ? 's' : ''}! Each bill gets its own notification.`
                      : result.candidates > 0 
                        ? `⚠️ Found ${result.candidates} unpaid bill${result.candidates > 1 ? 's' : ''} requiring reminders but no notifications were sent. Please check device tokens and server connection.`
                        : `ℹ️ No unpaid bills requiring reminders found. All bills are either paid or not yet due for reminders.`;
                    
                    alert(successMessage);
                  } catch (error) {
                    console.error("❌ Failed to send reminders:", error);
                    alert("❌ Failed to send reminders. Please check the console for details and ensure the notification server is running.");
                  } finally {
                    setSendingReminders(false);
                  }
                }}
                
              >
                {sendingReminders ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Sending Reminders...
                  </>
                ) : (
                  <>
                    Send Reminder
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="position-relative">
                <Search
                  size={16}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by student, parent, bill number, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="position-relative">
                <Filter
                  size={16}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />
                <select
                  className="form-select ps-5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-end">
                <span className="text-muted">
                  {filteredBills.length === 0
                    ? "No bills"
                    : `Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, filteredBills.length)} of ${filteredBills.length} bills`}
                </span>
              </div>
            </div>
          </div>

          {/* Bills Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <span className="fw-bold">{bill.billNumber}</span>
                      <br />
                      <small className="text-muted">
                        {new Date(bill.billDate).toLocaleDateString('en-GB')}
                      </small>
                    </td>
                    <td>{bill.studentName}</td>
                    <td>
                      <span className="badge bg-info">{bill.classId}</span>
                    </td>
                    <td>
                      <div>
                        <div>{bill.parentName}</div>
                        <small className="text-muted">{bill.parentEmail}</small>
                      </div>
                    </td>
                    <td>
                      <span className="fw-bold text-success">
                        RM {bill.totalAmount.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={isBillOverdue(bill) ? "text-danger fw-bold" : ""}>
                        {new Date(bill.dueDate).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td>{getStatusBadge(bill)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleBillClick(bill)}
                        >
                          View Details
                        </button>
                        {bill.paymentStatus !== "paid" && (
                          <button
                            className="btn btn-outline-success btn-sm"
                            onClick={() => handleStatusUpdate(bill.id, "paid")}
                            disabled={isUpdating}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBills.length === 0 && (
            <div className="text-center text-muted py-5">
              <Receipt size={48} className="mb-3 opacity-50" />
              <h5>No bills found</h5>
              <p>
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "No bills have been created yet"
                }
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredBills.length > 0 && (
            <div className="d-flex align-items-center justify-content-end mt-3">
              
              <nav aria-label="Bill pagination">
              <ul className="pagination mb-0 justify-content-end">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <li key={p} className={`page-item ${currentPage === p ? "active" : ""}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}

          {/* Bill Details Modal */}
          {showBillDetails && selectedBill && (
            <div
              className="modal fade show"
              style={{
                display: 'block',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1050,
              }}
              tabIndex={-1}
            >
              <div className="modal-dialog modal-lg modal-dialog-centered" style={{ zIndex: 1051 }}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Bill Details</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseDetails}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Bill Number:</strong> {selectedBill.billNumber}
                      </div>
                      <div className="col-md-6">
                        <strong>Status:</strong> {getStatusBadge(selectedBill)}
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Student:</strong> {selectedBill.studentName} ({selectedBill.classId})
                      </div>
                      <div className="col-md-6">
                        <strong>Parent:</strong> {selectedBill.parentName}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Bill Date:</strong> {new Date(selectedBill.billDate).toLocaleDateString('en-GB')}
                      </div>
                      <div className="col-md-6">
                        <strong>Due Date:</strong> {new Date(selectedBill.dueDate).toLocaleDateString('en-GB')}
                      </div>
                    </div>

                    <hr />

                    <h6>Bill Items:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th className="text-end">Amount (RM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.description}</td>
                              <td className="text-end">{item.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="fw-bold">
                            <td>Total Amount:</td>
                            <td className="text-end text-success">RM {selectedBill.totalAmount.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    {selectedBill.paymentStatus !== "paid" && (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleStatusUpdate(selectedBill.id, "paid")}
                        disabled={isUpdating}
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseDetails}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillList;
