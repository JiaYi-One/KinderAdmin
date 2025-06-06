import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

interface SubjectClass {
  subject: string;
  class: string;
}

interface Teacher {
  id: string;
  teacherID: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  subjectClasses: SubjectClass[];
}

function TeachersList() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTeacher, setEditedTeacher] = useState<Teacher | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAddMode, setIsAddMode] = useState(false);

  const classArray = ["3Y", "4Y", "5Y", "6Y"];
  const subjectArray = ["English", "Mathematics", "Malay", "Chinese", "Science"];

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'teachers'));
      const teachersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Teacher));
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditedTeacher(teacher);
    setShowTeacherDetails(true);
  };

  const handleCloseDetails = () => {
    setShowTeacherDetails(false);
    setSelectedTeacher(null);
    setEditedTeacher(null);
    setIsEditing(false);
    setError("");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isAddMode) {
      setShowTeacherDetails(false);
      setIsAddMode(false);
      setEditedTeacher(null);
      setIsEditing(false);
      setError("");
    } else {
      setEditedTeacher(selectedTeacher);
      setIsEditing(false);
      setError("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedTeacher) {
      setEditedTeacher({
        ...editedTeacher,
        [e.target.name]: e.target.value
      });
    }
  };

  const generateTeacherID = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digits
    return `T${year}K${randomNum}`;
  };

  const handleAddTeacherClick = () => {
    setIsAddMode(true);
    setEditedTeacher({
      id: '',
      teacherID: generateTeacherID(),
      teacherName: '',
      teacherEmail: '',
      teacherPhone: '',
      subjectClasses: []
    });
    setShowTeacherDetails(true);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedTeacher) return;
    setSaveLoading(true);
    setError("");
    try {
      const teacherRef = doc(db, "teachers", editedTeacher.teacherName);
      if (isAddMode) {
        // Create new teacher
        await setDoc(teacherRef, {
          teacherID: editedTeacher.teacherID,
          teacherName: editedTeacher.teacherName,
          teacherEmail: editedTeacher.teacherEmail,
          teacherPhone: editedTeacher.teacherPhone,
          subjectClasses: editedTeacher.subjectClasses
        });
        setTeachers(prev => [...prev, { ...editedTeacher, id: editedTeacher.teacherName }]);
      } else {
        // Update existing teacher
        await updateDoc(teacherRef, {
          teacherID: editedTeacher.teacherID,
          teacherName: editedTeacher.teacherName,
          teacherEmail: editedTeacher.teacherEmail,
          teacherPhone: editedTeacher.teacherPhone,
          subjectClasses: editedTeacher.subjectClasses
        });
        setTeachers(prev => prev.map(teacher =>
          teacher.id === editedTeacher.id ? { ...editedTeacher, id: editedTeacher.teacherName } : teacher
        ));
      }
      setSelectedTeacher(editedTeacher);
      setIsEditing(false);
      setIsAddMode(false);
      setShowTeacherDetails(false);
    } catch (error) {
      console.error("Error saving teacher:", error);
      setError("Failed to save teacher information");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (teacherName: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteDoc(doc(db, 'teachers', teacherName));
        await fetchTeachers();
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Failed to delete teacher. Please try again.');
      }
    }
  };

  const handleAddSubjectClass = () => {
    if (!editedTeacher) return;
    setEditedTeacher({
      ...editedTeacher,
      subjectClasses: [...(editedTeacher.subjectClasses || []), { subject: "", class: "" }]
    });
  };

  const handleRemoveSubjectClass = (index: number) => {
    if (!editedTeacher) return;
    const newSubjectClasses = [...editedTeacher.subjectClasses];
    newSubjectClasses.splice(index, 1);
    setEditedTeacher({
      ...editedTeacher,
      subjectClasses: newSubjectClasses
    });
  };

  const handleSubjectClassChange = (index: number, field: 'subject' | 'class', value: string) => {
    if (!editedTeacher) return;
    const newSubjectClasses = [...editedTeacher.subjectClasses];
    newSubjectClasses[index] = {
      ...newSubjectClasses[index],
      [field]: value
    };
    setEditedTeacher({
      ...editedTeacher,
      subjectClasses: newSubjectClasses
    });
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h3 fw-bold m-0">Teachers List</h2>
            <button className="btn btn-success" onClick={handleAddTeacherClick}>Add Teacher</button>
          </div>

          {/* Teachers List */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Teacher ID</th>
                  <th>Name</th>
                  <th>Subject & Classes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr 
                    key={teacher.id}
                    onClick={() => handleTeacherClick(teacher)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{teacher.teacherID}</td>
                    <td>{teacher.teacherName}</td>
                    <td>
                      {teacher.subjectClasses?.map((sc, index) => (
                        <div key={index}>
                          {sc.subject} - Class {sc.class}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(teacher.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Teacher Details Modal */}
          {showTeacherDetails && (selectedTeacher || isAddMode) && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Teacher Details</h5>
                    <button type="button" className="btn-close" onClick={handleCloseDetails}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold">Teacher ID:</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        name="teacherID"
                        value={editedTeacher?.teacherID || ""}
                        onChange={handleInputChange}
                        readOnly
                      />
                      {isAddMode && (
                        <div className="form-text text-muted">Auto-generated, cannot edit</div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className={`form-control${!isEditing ? ' bg-light' : ''}`}
                        name="teacherName"
                        value={editedTeacher?.teacherName || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className={`form-control${!isEditing ? ' bg-light' : ''}`}
                        name="teacherEmail"
                        value={editedTeacher?.teacherEmail || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className={`form-control${!isEditing ? ' bg-light' : ''}`}
                        name="teacherPhone"
                        value={editedTeacher?.teacherPhone || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Subject & Class Assignments</label>
                      {editedTeacher?.subjectClasses?.map((sc, index) => (
                        <div key={index} className="row mb-2">
                          <div className="col">
                            <select
                              className={`form-select${!isEditing ? ' bg-light' : ''}`}
                              value={sc.subject}
                              onChange={(e) => handleSubjectClassChange(index, 'subject', e.target.value)}
                              disabled={!isEditing}
                            >
                              <option value="">Select Subject</option>
                              {subjectArray.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col">
                            <select
                              className={`form-select${!isEditing ? ' bg-light' : ''}`}
                              value={sc.class}
                              onChange={(e) => handleSubjectClassChange(index, 'class', e.target.value)}
                              disabled={!isEditing}
                            >
                              <option value="">Select Class</option>
                              {classArray.map(className => (
                                <option key={className} value={className}>Class {className}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-auto">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveSubjectClass(index)}
                              disabled={!isEditing}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {isEditing && (
                        <div className="mt-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleAddSubjectClass}
                          >
                            Add Subject & Class
                          </button>
                        </div>
                      )}
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

          {teachers.length === 0 && (
            <div className="text-center text-muted py-4">
              No teachers registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeachersList;