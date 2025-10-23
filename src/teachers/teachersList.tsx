import { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { Plus, X } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Firebase configuration for secondary app (same as main app)
const firebaseConfig = {
  apiKey: "AIzaSyCUMD_LPPeLjD3tQCgqYWYLqIvqg7MOi7E",
  authDomain: "fyp1-89f1d.firebaseapp.com",
  projectId: "fyp1-89f1d",
  storageBucket: "fyp1-89f1d.firebasestorage.app",
  messagingSenderId: "216309172405",
  appId: "1:216309172405:web:bc626b69ed7018a63656fc",
  measurementId: "G-C7M9R3NDN6",
};

// Create secondary Firebase app for user creation without affecting current auth state
const secondaryApp = initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

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
  role: 'teacher' | 'admin';
}

interface SubjectTemplate {
  id: string;
  subject: string;
  createdAt: Date;
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
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'teacher' | 'admin' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'admin'>('teacher');
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  const [subjectTemplates, setSubjectTemplates] = useState<SubjectTemplate[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [showSubjectSaved, setShowSubjectSaved] = useState(false);

  const classArray = ["3Y", "4Y", "5Y", "6Y"];
  const defaultSubjects = ["English", "Mathematics", "Malay", "Chinese", "Science"];

  // Load subject templates from localStorage
  const loadSubjectTemplates = () => {
    try {
      const saved = localStorage.getItem('teacherSubjectTemplates');
      if (saved) {
        const templates = JSON.parse(saved).map((t: { id: string; subject: string; createdAt: string }) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        }));
        setSubjectTemplates(templates);
      } else {
        // Initialize with default subjects
        const defaultTemplates = defaultSubjects.map((subject, index) => ({
          id: (index + 1).toString(),
          subject: subject,
          createdAt: new Date()
        }));
        setSubjectTemplates(defaultTemplates);
        localStorage.setItem('teacherSubjectTemplates', JSON.stringify(defaultTemplates));
      }
    } catch (error) {
      console.error('Error loading subject templates:', error);
    }
  };

  // Save subject templates to localStorage
  const saveSubjectTemplates = (templates: SubjectTemplate[]) => {
    try {
      localStorage.setItem('teacherSubjectTemplates', JSON.stringify(templates));
      setSubjectTemplates(templates);
    } catch (error) {
      console.error('Error saving subject templates:', error);
    }
  };

  // Add new subject template
  const addSubjectTemplate = () => {
    if (newSubject.trim()) {
      const newTemplate: SubjectTemplate = {
        id: Date.now().toString(),
        subject: newSubject.trim(),
        createdAt: new Date()
      };
      const updatedTemplates = [...subjectTemplates, newTemplate];
      saveSubjectTemplates(updatedTemplates);
      setNewSubject("");
      
      // Show brief notification
      setShowSubjectSaved(true);
      setTimeout(() => setShowSubjectSaved(false), 2000);
    }
  };

  // Delete subject template
  const deleteSubjectTemplate = (id: string) => {
    const updatedTemplates = subjectTemplates.filter(t => t.id !== id);
    saveSubjectTemplates(updatedTemplates);
  };

  // Get all available subjects (default + templates)
  const getAllSubjects = () => {
    return subjectTemplates.map(t => t.subject);
  };

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const staffRef = collection(db, "staff");
      const q = query(staffRef, where("role", "==", selectedRole));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teacher[];
      setTeachers(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchTeachers();
    loadSubjectTemplates();
  }, [fetchTeachers]);

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
    setIsAddMode(false);
    setError("");
    setSelectedUserType(null);
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
    setShowUserTypeModal(true);
  };

  const handleUserTypeSelect = (type: 'teacher' | 'admin') => {
    setSelectedUserType(type);
    setShowUserTypeModal(false);
    setIsAddMode(true);
    setEditedTeacher({
      id: '',
      teacherID: generateTeacherID(),
      teacherName: '',
      teacherEmail: '',
      teacherPhone: '',
      subjectClasses: [],
      role: type
    });
    setShowTeacherDetails(true);
    setIsEditing(true);
  };

  const createAuthAccount = async (email: string, staffId: string) => {
    try {
      // Ensure the password (staffId) is at least 6 characters
      if (staffId.length < 6) {
        throw new Error('Staff ID must be at least 6 characters long');
      }

      // Use secondary auth instance to avoid logging out current user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, staffId);
      
      // Sign out from secondary auth immediately to avoid any side effects
      await secondaryAuth.signOut();
      
      return userCredential;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          throw new Error('This email is already registered. Please use a different email.');
        }
        throw error;
      }
      throw new Error('Failed to create account. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError("");

      // Validate required fields
      if (!editedTeacher?.teacherName || !editedTeacher?.teacherEmail || !editedTeacher?.teacherPhone || !editedTeacher?.teacherID) {
        setError("Please fill in all required fields: Name, Email, Phone, and ID");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedTeacher.teacherEmail)) {
        setError("Please enter a valid email address");
        return;
      }

      // Validate staff ID length
      if (editedTeacher.teacherID.length < 6) {
        setError("Staff ID must be at least 6 characters long");
        return;
      }

      // For teachers, validate subject-class assignments
      if (editedTeacher.role === 'teacher') {
        const hasEmptyAssignments = editedTeacher.subjectClasses?.some(
          sc => !sc.subject || !sc.class
        );
        if (hasEmptyAssignments) {
          setError("Please select both subject and class for all assignments");
          return;
        }

        // Check for duplicate assignments
        const assignments = editedTeacher.subjectClasses || [];
        const uniqueAssignments = new Set(assignments.map(sc => `${sc.subject}-${sc.class}`));
        if (uniqueAssignments.size !== assignments.length) {
          setError("Duplicate subject-class assignments are not allowed");
          return;
        }
      }

      const staffRef = doc(db, "staff", editedTeacher.teacherName);
      
      if (isAddMode) {
        try {
          // Create auth account using staff ID as password
          const userCredential = await createAuthAccount(editedTeacher.teacherEmail, editedTeacher.teacherID);
          const uid = userCredential.user.uid;

          // Create staff document with teacherName as document ID using main db
          const staffRef = doc(db, "staff", editedTeacher.teacherName);
          const staffData = {
            teacherID: editedTeacher.teacherID,
            teacherName: editedTeacher.teacherName,
            teacherEmail: editedTeacher.teacherEmail,
            teacherPhone: editedTeacher.teacherPhone,
            role: editedTeacher.role,
            subjectClasses: editedTeacher.subjectClasses || [],
            uid: uid,
            createdAt: serverTimestamp()
          };

          console.log("Creating staff document with data:", staffData);
          await setDoc(staffRef, staffData);
          console.log("Staff document created successfully");

          // Show credentials modal with staff ID as password
          setGeneratedCredentials({
            email: editedTeacher.teacherEmail,
            password: editedTeacher.teacherID
          });
          setShowCredentials(true);
        } catch (error) {
          console.error("Error in add mode:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Failed to create staff account. Please try again.");
          }
          return;
        }
      } else {
        try {
          // Ensure name and email haven't been changed
          if (selectedTeacher) {
            if (selectedTeacher.teacherName !== editedTeacher.teacherName) {
              setError("Name cannot be modified");
              return;
            }
            if (selectedTeacher.teacherEmail !== editedTeacher.teacherEmail) {
              setError("Email cannot be modified");
              return;
            }
          }

          // Update existing staff
          const updateData = {
            teacherPhone: editedTeacher.teacherPhone,
            role: editedTeacher.role,
            subjectClasses: editedTeacher.subjectClasses || [],
            updatedAt: serverTimestamp()
          };

          console.log("Updating staff document with data:", updateData);
          await updateDoc(staffRef, updateData);
          console.log("Staff document updated successfully");
        } catch (error) {
          console.error("Error in update mode:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Failed to update staff information. Please try again.");
          }
          return;
        }
      }

      // Refresh the list
      await fetchTeachers();
      
      // Reset all states after successful save
      setShowTeacherDetails(false);
      setShowCredentials(false);
      setIsAddMode(false);
      setIsEditing(false);
      setEditedTeacher(null);
      setSelectedTeacher(null);
      setSelectedUserType(null);
      setError("");
    } catch (error) {
      console.error("Error in handleSave:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to save changes. Please try again.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (window.confirm(`Are you sure you want to delete ${teacher.teacherName}?`)) {
      try {
        // Delete from Firestore
        const staffRef = doc(db, "staff", teacher.id);
        await deleteDoc(staffRef);

        // Delete from Firebase Auth
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user && user.email === teacher.teacherEmail) {
          await deleteUser(user);
        } else {
          // If the current user is not the one being deleted, we need to sign in as that user first
          // This is a limitation of Firebase Auth - only the current user can be deleted
          setError("Cannot delete authentication account. Please contact an administrator.");
        }

        fetchTeachers();
      } catch (error) {
        console.error("Error deleting staff:", error);
        setError("Failed to delete staff. Please try again.");
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
            <div className="d-flex align-items-center gap-3">
              <h2 className="h3 fw-bold m-0">Staff List</h2>
              <select 
                className="form-select w-auto"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'teacher' | 'admin')}
              >
                <option value="teacher">Teachers</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-info" 
                onClick={() => setShowSubjectModal(true)}
                title="Manage Subject Templates"
              >
                Manage Subjects
              </button>
             
              <button className="btn btn-success" onClick={handleAddTeacherClick}>Add</button>
            </div>
          </div>

          {/* User Type Selection Modal */}
          {showUserTypeModal && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Select User Type</h5>
                    <button type="button" className="btn-close" onClick={() => setShowUserTypeModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="d-grid gap-3">
                      <button 
                        className="btn btn-primary btn-lg"
                        onClick={() => handleUserTypeSelect('teacher')}
                      >
                        Add New Teacher
                      </button>
                      <button 
                        className="btn btn-secondary btn-lg"
                        onClick={() => handleUserTypeSelect('admin')}
                      >
                        Add New Admin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>{selectedRole === 'teacher' ? 'Teacher ID' : 'Admin ID'}</th>
                  <th>Name</th>
                  {selectedRole === 'teacher' ? (
                    <th>Subject & Classes</th>
                  ) : (
                    <th>Phone</th>
                  )}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers
                  .filter(teacher => teacher.role === selectedRole)
                  .map((teacher) => (
                  <tr 
                    key={teacher.id}
                    onClick={() => handleTeacherClick(teacher)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{teacher.teacherID}</td>
                    <td>{teacher.teacherName}</td>
                    {selectedRole === 'teacher' ? (
                      <td>
                        {teacher.subjectClasses?.map((sc, index) => (
                          <div key={index}>
                            {sc.subject} - Class {sc.class}
                          </div>
                        ))}
                      </td>
                    ) : (
                      <td>{teacher.teacherPhone}</td>
                    )}
                    <td>
                      <button
                        className="btn btn-danger btn-sm me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(teacher);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teachers.filter(teacher => teacher.role === selectedRole).length === 0 && (
              <div className="text-center text-muted py-4">
                {selectedRole === 'teacher' ? 'No teachers registered.' : 'No administrators registered.'}
              </div>
            )}
          </div>

          {/* Teacher Details Modal */}
          {showTeacherDetails && (selectedTeacher || isAddMode) && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isAddMode 
                        ? `Add New ${selectedUserType === 'admin' ? 'Admin' : 'Teacher'}`
                        : `${editedTeacher?.role === 'admin' ? 'Admin' : 'Teacher'} Details`}
                    </h5>
                    <button type="button" className="btn-close" onClick={handleCloseDetails}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    
                    
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold">ID:</label>
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
                      <label className="form-label">
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control${!isEditing && !isAddMode ? ' bg-light' : ''}`}
                        name="teacherName"
                        value={editedTeacher?.teacherName || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing && !isAddMode}
                        disabled={!isAddMode}
                        placeholder={isAddMode ? "Enter teacher name" : ""}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className={`form-control${!isEditing && !isAddMode ? ' bg-light' : ''}`}
                        name="teacherEmail"
                        value={editedTeacher?.teacherEmail || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing && !isAddMode}
                        disabled={!isAddMode}
                        placeholder={isAddMode ? "Enter email address" : ""}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Phone <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`form-control${!isEditing ? ' bg-light' : ''}`}
                        name="teacherPhone"
                        value={editedTeacher?.teacherPhone || ""}
                        onChange={handleInputChange}
                        readOnly={!isEditing}
                        placeholder={isAddMode ? "Enter phone number" : ""}
                      />
                    </div>

                    {/* Subject & Class Assignments (Teachers only) */}
                    {editedTeacher?.role === 'teacher' && (
                      <div className="mb-3">
                        <label className="form-label">Subject & Class Assignments</label>
                        {editedTeacher?.subjectClasses && editedTeacher.subjectClasses.length > 0 ? (
                          editedTeacher.subjectClasses.map((sc, index) => (
                            <div key={index} className="row mb-2">
                              <div className="col">
                                <select
                                  className={`form-select${!isEditing ? ' bg-light' : ''}${!sc.subject && isEditing ? ' is-invalid' : ''}`}
                                  value={sc.subject}
                                  onChange={(e) => handleSubjectClassChange(index, 'subject', e.target.value)}
                                  disabled={!isEditing}
                                  required
                                >
                                  <option value="">Select Subject</option>
                                  {getAllSubjects().map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                  ))}
                                </select>
                                {!sc.subject && isEditing && (
                                  <div className="invalid-feedback">Please select a subject</div>
                                )}
                              </div>
                              <div className="col">
                                <select
                                  className={`form-select${!isEditing ? ' bg-light' : ''}${!sc.class && isEditing ? ' is-invalid' : ''}`}
                                  value={sc.class}
                                  onChange={(e) => handleSubjectClassChange(index, 'class', e.target.value)}
                                  disabled={!isEditing}
                                  required
                                >
                                  <option value="">Select Class</option>
                                  {classArray.map(className => (
                                    <option key={className} value={className}>Class {className}</option>
                                  ))}
                                </select>
                                {!sc.class && isEditing && (
                                  <div className="invalid-feedback">Please select a class</div>
                                )}
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
                          ))
                        ) : (
                          <div className="border rounded p-3">
                            <div className="text-center text-muted py-3">
                              <i className="bi bi-info-circle me-2"></i>
                              No classes or subjects assigned
                            </div>
                          </div>
                        )}
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
                    )}
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

          {/* Credentials Modal */}
          {showCredentials && generatedCredentials && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex={-1}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Login Credentials Generated</h5>
                    <button type="button" className="btn-close" onClick={() => {
                      setShowCredentials(false);
                      setShowTeacherDetails(false);
                      setGeneratedCredentials(null);
                      setIsAddMode(false);
                      setIsEditing(false);
                      setEditedTeacher(null);
                      setSelectedTeacher(null);
                      setSelectedUserType(null);
                      setError("");
                    }}></button>
                  </div>
                  <div className="modal-body">
                    <div className="alert alert-info">
                      <p className="mb-2">Please save these credentials securely. They will be needed for the staff member to log in.</p>
                      <p className="mb-1"><strong>Email:</strong> {generatedCredentials.email}</p>
                      <p className="mb-0"><strong>Password:</strong> {generatedCredentials.password}</p>
                    </div>
                    <div className="alert alert-warning">
                      <p className="mb-0">Note: For security reasons, these credentials will not be shown again. Please make sure to share them securely with the staff member.</p>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setShowCredentials(false);
                        setShowTeacherDetails(false);
                        setGeneratedCredentials(null);
                        setIsAddMode(false);
                        setIsEditing(false);
                        setEditedTeacher(null);
                        setSelectedTeacher(null);
                        setSelectedUserType(null);
                        setError("");
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          

          {/* Subject Saved Notification */}
          {showSubjectSaved && (
            <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
              <div className="toast show" role="alert">
                <div className="toast-body">
                  New subject has been added to your templates.
                </div>
              </div>
            </div>
          )}

          {/* Subject Template Modal */}
          {showSubjectModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Subject Management</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowSubjectModal(false);
                        setNewSubject("");
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    {/* Add New Subject */}
                    <div className="mb-4">
                      <label className="form-label">Add New Subject</label>
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="Enter subject name"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addSubjectTemplate();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={addSubjectTemplate}
                          disabled={!newSubject.trim()}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Existing Subjects */}
                    <div>
                      <label className="form-label">Available Subjects</label>
                      <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {subjectTemplates.length === 0 ? (
                          <div className="text-muted text-center py-3">
                            No subjects available. Add your first subject above.
                          </div>
                        ) : (
                          subjectTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <span>{template.subject}</span>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteSubjectTemplate(template.id)}
                                title="Delete subject"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowSubjectModal(false);
                        setNewSubject("");
                      }}
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

export default TeachersList;