import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Receipt,
  Save,
  Users,
  Search,
  CheckCircle2,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
} from "firebase/firestore";

interface Student {
  class_id: string;
  id: string;
  name: string;
  studentName: string;
  studentId: string;
  birthDate: string;
  age: string;
  address: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}
interface Bill {
  studentName: string;
  studentId: string;
  items: BillItem[];
  totalAmount: number;
  billDate: string;
  reference: string;
  billNumber: string;
}

interface BillItem {
  id: number;
  description: string;
  amount: number;
}

interface FormData {
  billDate: string;
  reference: string;
  billNumber: string;
}

function CreateBill() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]); // Store student IDs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectWholeClass, setSelectWholeClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BillItem[]>([
    { id: 1, description: "Tuition Fee", amount: 0 },
  ]);
  const [formData, setFormData] = useState<FormData>({
    billDate: new Date().toISOString().split("T")[0],
    reference: "",
    billNumber: `${new Date().getFullYear()}-${Math.floor(
      Math.random() * 100
    )}-${Math.floor(Math.random() * 100)}`,
  });
  const [, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Starting to fetch classes...");

        // Create a direct query to list all documents
        const q = query(collection(db, "classes"));
        const querySnapshot = await getDocs(q);

        // Log each document found
        querySnapshot.forEach((doc) => {
          console.log("Found document:", {
            id: doc.id,
            path: doc.ref.path,
            metadata: doc.metadata,
            data: doc.data(),
          });
        });

        // Get all class IDs
        const allClasses = querySnapshot.docs.map((doc) => doc.id);
        console.log("All class IDs before sorting:", allClasses);

        // Sort and set the classes
        const classesData = allClasses.sort((a, b) => a.localeCompare(b));
        console.log("Final sorted classes:", classesData);

        if (classesData.length === 0) {
          console.warn("No classes found in the database");
        } else if (classesData.length === 1) {
          console.warn("Only one class found:", classesData[0]);
        }

        setClasses(classesData);
      } catch (error) {
        console.error("Error fetching classes:", {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
          type: error instanceof Error ? error.constructor.name : typeof error,
        });
        alert("Failed to load classes. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClassSelection = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedClassName = event.target.value;
    console.log("Selected class:", selectedClassName);
    setSelectedClass(selectedClassName);
    setSelectedStudentIds([]);
    setSelectWholeClass(false);
    setSearchTerm("");

    if (selectedClassName) {
      try {
        // Get students from the selected class's student subcollection
        const studentsRef = collection(
          db,
          "classes",
          selectedClassName,
          "students"
        );
        const studentsSnapshot = await getDocs(studentsRef);

        // Log the raw student data
        console.log(
          "Raw students snapshot:",
          studentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            data: doc.data(),
          }))
        );

        const studentsData = studentsSnapshot.docs.map((doc) => ({
          studentName: doc.data().studentName || doc.data().name,
          studentId: doc.id,
          birthDate: doc.data().birthDate || "",
          age: doc.data().age || "",
          address: doc.data().address || "",
          parentId: doc.data().parentId || "",
          parentName: doc.data().parentName || "",
          parentPhone: doc.data().parentPhone || "",
          parentEmail: doc.data().parentEmail || "",
          class_id: selectedClassName,
          id: doc.id,
          name: doc.data().studentName || doc.data().name,
        }));

        console.log("Processed students:", studentsData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Detailed error fetching students:", error);
        alert("Failed to load students. Please try again.");
      }
    }
  };

  const handleWholeClassToggle = () => {
    if (selectedClass) {
      const classStudents = students.filter(
        (s) => s.class_id === selectedClass
      );
      setSelectWholeClass(!selectWholeClass);
      setSelectedStudentIds(
        !selectWholeClass ? classStudents.map((s) => s.id) : []
      );
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(
    (student) =>
      student.class_id === selectedClass &&
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = () => {
    const newItem = {
      id: Math.max(0, ...items.map((item) => item.id)) + 1,
      description: "",
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleInputChange = (
    id: number,
    field: keyof BillItem,
    value: string
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "amount" ? parseFloat(value) || 0 : value,
            }
          : item
      )
    );
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedStudentIds.length === 0) {
        alert("Please select at least one student");
        return;
      }

      if (!items.some((item) => item.amount > 0)) {
        alert("Please add at least one item with an amount");
        return;
      }

      // Group students by parent ID to avoid duplicate notifications
      const parentBills: { [parentId: string]: Bill[] } = {};

      // Create bills and group them by parent
      for (const studentId of selectedStudentIds) {
        const student = students.find((s) => s.id === studentId);
        if (!student) continue;

        // Create bill document
        const billDocRef = doc(collection(db, "bills"));
        const billData = {
          billNumber: formData.billNumber,
          billDate: formData.billDate,
          reference: formData.reference,
          items: items,
          totalAmount: total,
          paymenyStatus: "unpaid",
          createdAt: new Date(),
          studentId: student.id,
          studentName: student.name,
          classId: student.class_id,
          parentId: student.parentId,
          parentName: student.parentName,
          parentEmail: student.parentEmail,
        };

        await setDoc(billDocRef, billData);

        // Group bills by parent
        if (!parentBills[student.parentId]) {
          parentBills[student.parentId] = [];
        }
        parentBills[student.parentId].push(billData);
      }

      // Create notifications for each parent
      for (const [parentId, bills] of Object.entries(parentBills)) {
        const notificationRef = doc(collection(db, "notifications"));
        await setDoc(notificationRef, {
          createdAt: new Date(),
          parentId: parentId,
          type: "new_bill",
          isRead: false,
          billCount: bills.length,
          totalAmount: bills.reduce((sum: number, bill) => sum + bill.totalAmount, 0), // ✅ Fixed
          message: `You have ${bills.length} new bill${bills.length > 1 ? "s" : ""} to review`,
          bills: bills.map((bill) => ({
            billNumber: bill.billNumber,
            amount: bill.totalAmount,
            studentName: bill.studentName,
          })),
        });
      }
      

      alert("Bills created and notifications sent successfully!");

      // Reset form
      setFormData({
        billDate: new Date().toISOString().split("T")[0],
        reference: "",
        billNumber: `${new Date().getFullYear()}-${Math.floor(
          Math.random() * 100
        )}-${Math.floor(Math.random() * 100)}`,
      });
      setSelectedStudentIds([]);
      setItems([{ id: 1, description: "Tuition Fee", amount: 0 }]);
    } catch (error) {
      console.error("Error creating bills:", error);
      alert("Failed to create bills. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  // Add this function to create a class

  // Call it to create 4Y if needed
  // createClass("4Y");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-4">
      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Left Column - Student Selection */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                  <Users size={20} />
                  Select Recipients
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label">Class</label>
                  <select
                    className="form-select"
                    value={selectedClass}
                    onChange={handleClassSelection}
                  >
                    <option value="">Select a class</option>
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClass && (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="selectWholeClass"
                          checked={selectWholeClass}
                          onChange={handleWholeClassToggle}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="selectWholeClass"
                        >
                          Select Whole Class
                        </label>
                      </div>
                      <span className="badge bg-primary">
                        {selectedStudentIds.length} selected
                      </span>
                    </div>

                    <div className="position-relative mb-3">
                      <Search
                        size={16}
                        className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                      />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div
                      className="student-list"
                      style={{ maxHeight: "400px", overflowY: "auto" }}
                    >
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`d-flex align-items-center justify-content-between p-2 rounded cursor-pointer ${
                            selectedStudentIds.includes(student.id)
                              ? "bg-light"
                              : ""
                          }`}
                          onClick={() => handleStudentToggle(student.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <span>{student.name}</span>
                          {selectedStudentIds.includes(student.id) && (
                            <CheckCircle2 size={16} className="text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Bill Details */}
          <div className="col-md-8">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Payment Details</h5>
                <div className="badge bg-primary">Draft</div>
              </div>
              <div className="card-body">
                {/* Bill Info */}
                <div className="row mb-4">
                  <div className="col-md-4">
                    <label className="form-label">Bill Date</label>
                    <input
                      type="date"
                      name="billDate"
                      value={formData.billDate}
                      onChange={handleFormChange}
                      className="form-control"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Reference</label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleFormChange}
                      placeholder="Enter reference"
                      className="form-control"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Bill Number</label>
                    <input
                      type="text"
                      name="billNumber"
                      value={formData.billNumber}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="table-responsive">
                  <table className="table table-bordered mb-4">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "60px" }}>No</th>
                        <th>Description</th>
                        <th style={{ width: "200px" }} className="text-end">
                          Amount (RM)
                        </th>
                        <th style={{ width: "60px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={item.description}
                              className="form-control"
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Enter description"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.amount}
                              className="form-control text-end"
                              onChange={(e) =>
                                handleInputChange(
                                  item.id,
                                  "amount",
                                  e.target.value
                                )
                              }
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="btn btn-outline-danger btn-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-outline-secondary mb-4"
                >
                  <Plus size={16} /> Add Item
                </button>

                {/* Total */}
                <div className="d-flex justify-content-end mb-4">
                  <div className="card bg-light border-0">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold me-4">Total Amount:</span>
                        <span className="fs-4 fw-bold text-danger">
                          RM {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="d-flex justify-content-end gap-3">
                  <button type="button" className="btn btn-outline-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={
                      !selectedStudentIds.length ||
                      !items.some((item) => item.amount > 0)
                    }
                  >
                    <Save size={16} />
                    Save Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Footer */}
      <footer className="mt-4 d-flex justify-content-between text-secondary small">
        <span>BillCreator</span>
        <div className="d-flex align-items-center gap-2">
          <Receipt size={16} />
          <span>Need help with billing?</span>
        </div>
      </footer>
    </div>
  );
}

export default CreateBill;
