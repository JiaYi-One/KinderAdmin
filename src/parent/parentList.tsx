import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import ChangePassword from "../auth/changePassword";
import "bootstrap/dist/css/bootstrap.min.css";

interface Parent {
  name: string;
  parentId: string;
  email: string;
  phone: string;
  student_id: string[];
}

interface Student {
  name: string;
  class_id: string;
  studentId: string;
}

interface ParentWithClass extends Parent {
  students: Student[];
}

function ParentList() {
  const [parentsByClass, setParentsByClass] = useState<{ [key: string]: ParentWithClass[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedParent, setSelectedParent] = useState<ParentWithClass | null>(null);
  const [showParentDetails, setShowParentDetails] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedParent, setEditedParent] = useState<ParentWithClass | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const classArray = ["3Y", "4Y", "5Y", "6Y"];

  useEffect(() => {
    const fetchParentsAndStudents = async () => {
      try {
        // Fetch all parents
        const parentsCollection = collection(db, "parents");
        const parentsSnapshot = await getDocs(parentsCollection);
        const parentsList = parentsSnapshot.docs.map(doc => ({
          ...doc.data(),
          parentId: doc.id,
          students: []
        })) as unknown as ParentWithClass[];

        // Fetch students for each parent
        const studentsCollection = collection(db, "students");
        const studentsSnapshot = await getDocs(studentsCollection);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          ...doc.data(),
          studentId: doc.id
        })) as unknown as Student[];

        // Group parents by class
        const parentsByClassMap: { [key: string]: ParentWithClass[] } = {};

        parentsList.forEach(parent => {
          const parentStudents = studentsList.filter(student => 
            parent.student_id?.includes(student.studentId)
          );

          parentStudents.forEach(student => {
            const classId = student.class_id;
            if (!parentsByClassMap[classId]) {
              parentsByClassMap[classId] = [];
            }
            if (!parentsByClassMap[classId].find(p => p.parentId === parent.parentId)) {
              parentsByClassMap[classId].push({
                ...parent,
                students: parentStudents
              });
            }
          });
        });

        setParentsByClass(parentsByClassMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParentsAndStudents();
  }, []);

  const handleParentClick = async (parent: ParentWithClass) => {
    setSelectedParent(parent);
    setEditedParent(parent);
    setShowParentDetails(true);
  };

  const handleCloseDetails = () => {
    setShowParentDetails(false);
    setSelectedParent(null);
    setEditedParent(null);
    setIsEditing(false);
    setError("");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedParent(selectedParent);
    setIsEditing(false);
    setError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedParent) {
      setEditedParent({
        ...editedParent,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSave = async () => {
    if (!editedParent) return;

    setSaveLoading(true);
    setError("");

    try {
      const parentRef = doc(db, "parents", editedParent.parentId);
      await updateDoc(parentRef, {
        name: editedParent.name,
        email: editedParent.email,
        phone: editedParent.phone
      });

      // Update local state
      setSelectedParent(editedParent);
      setParentsByClass(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(classId => {
          newState[classId] = newState[classId].map(parent =>
            parent.parentId === editedParent.parentId ? editedParent : parent
          );
        });
        return newState;
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating parent:", error);
      setError("Failed to update parent information");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false);
    setShowParentDetails(false);
    alert("Password updated successfully!");
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
    <div className="min-vh-100 bg-light p-4">
      <div className="container">
        <div className="bg-white rounded shadow p-4">
          <h2 className="h3 fw-bold mb-4">Parents by Class</h2>
          
          {/* Class Selection */}
          <div className="mb-4">
            <label htmlFor="classSelect" className="form-label">Select Class:</label>
            <select
              id="classSelect"
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classArray.map((className) => (
                <option key={className} value={className}>
                  Class {className}
                </option>
              ))}
            </select>
          </div>

          {/* Parent List */}
          {selectedClass && parentsByClass[selectedClass] && (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Parent ID</th>
                    <th>Parent Name</th>
                    <th>Student(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {parentsByClass[selectedClass].map((parent) => (
                    <tr 
                      key={parent.parentId}
                      onClick={() => handleParentClick(parent)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{parent.parentId}</td>
                      <td>{parent.name}</td>
                      <td>
                        {parent.students
                          .filter(student => student.class_id === selectedClass)
                          .map(student => student.name)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Parent Details Modal */}
          {showParentDetails && selectedParent && (
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
                zIndex: 1050
              }} 
              tabIndex={-1}
            >
              <div 
                className="modal-dialog modal-dialog-centered"
                style={{ zIndex: 1051 }}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Parent Details</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseDetails}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <strong>Parent ID:</strong> {selectedParent.parentId}
                    </div>
                    
                    {isEditing ? (
                      <>
                        <div className="mb-3">
                          <label htmlFor="name" className="form-label">Name</label>
                          <input
                            type="text"
                            className="form-control"
                            id="name"
                            name="name"
                            value={editedParent?.name || ""}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="email" className="form-label">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            id="email"
                            name="email"
                            value={editedParent?.email || ""}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="phone" className="form-label">Phone</label>
                          <input
                            type="tel"
                            className="form-control"
                            id="phone"
                            name="phone"
                            value={editedParent?.phone || ""}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3">
                          <strong>Name:</strong> {selectedParent.name}
                        </div>
                        <div className="mb-3">
                          <strong>Email:</strong> {selectedParent.email}
                        </div>
                        <div className="mb-3">
                          <strong>Phone:</strong> {selectedParent.phone}
                        </div>
                      </>
                    )}

                    <div className="mb-3">
                      <strong>Students:</strong>
                      <ul className="list-unstyled mt-2">
                        {selectedParent.students.map((student) => (
                          <li key={student.studentId}>
                            {student.name} (Class {student.class_id})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="modal-footer">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary me-2"
                          onClick={handleCancelEdit}
                          disabled={saveLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleSave}
                          disabled={saveLoading}
                        >
                          {saveLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary me-2"
                          onClick={handleEdit}
                        >
                          Edit Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-warning me-2"
                          onClick={handleChangePassword}
                        >
                          Change Password
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCloseDetails}
                        >
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Modal */}
          {showChangePassword && selectedParent && (
            <ChangePassword
              userId={selectedParent.parentId}
              userEmail={selectedParent.email}
              onSuccess={handlePasswordChangeSuccess}
              onCancel={() => setShowChangePassword(false)}
            />
          )}

          {selectedClass && (!parentsByClass[selectedClass] || parentsByClass[selectedClass].length === 0) && (
            <div className="text-center text-muted py-4">
              No parents registered in this class.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParentList;

