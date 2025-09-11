import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import "bootstrap/dist/css/bootstrap.min.css";

interface StudentDoc {
  name: string;
  class_id: string;
  parentId?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  relationship?: string;
  icNumber?: string;
  age?: string | number;
  gender?: string;
  address?: string;
}

interface Student extends StudentDoc {
  studentId: string;
}

function StudentList() {
  const [studentsByClass, setStudentsByClass] = useState<{ [key: string]: Student[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const classArray = ["3Y", "4Y", "5Y", "6Y"];

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsCollection = collection(db, "students");
        const studentsSnapshot = await getDocs(studentsCollection);
        const studentsList: Student[] = studentsSnapshot.docs.map(doc => ({
          ...(doc.data() as StudentDoc),
          studentId: doc.id,
        }));

        const grouped: { [key: string]: Student[] } = {};
        studentsList.forEach(student => {
          const classId = student.class_id;
          if (!grouped[classId]) grouped[classId] = [];
          grouped[classId].push(student);
        });

        setStudentsByClass(grouped);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  const handleCloseDetails = () => {
    setShowStudentDetails(false);
    setSelectedStudent(null);
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
          <h2 className="h3 fw-bold mb-4">Students by Class</h2>

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

          {selectedClass && studentsByClass[selectedClass] && (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsByClass[selectedClass]
                    .sort((a, b) => a.studentId.localeCompare(b.studentId))
                    .map((student) => (
                      <tr
                        key={student.studentId}
                        onClick={() => handleStudentClick(student)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{student.studentId}</td>
                        <td>{student.name}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {showStudentDetails && selectedStudent && (
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
              <div className="modal-dialog modal-dialog-centered" style={{ zIndex: 1051 }}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Student Details</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseDetails}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-2"><strong>Student ID:</strong> {selectedStudent.studentId}</div>
                    <div className="mb-2"><strong>Name:</strong> {selectedStudent.name}</div>
                    <div className="mb-2"><strong>Class:</strong> {selectedStudent.class_id}</div>
                    <div className="mb-2"><strong>IC Number:</strong> {selectedStudent.icNumber || '-'}</div>
                    <div className="mb-2"><strong>Age:</strong> {selectedStudent.age || '-'}</div>
                    <div className="mb-2"><strong>Gender:</strong> {selectedStudent.gender || '-'}</div>
                    <div className="mb-2"><strong>Address:</strong> {selectedStudent.address || '-'}</div>
                    <hr />
                    <div className="mb-2"><strong>Parent ID:</strong> {selectedStudent.parentId || '-'}</div>
                    <div className="mb-2"><strong>Parent Name:</strong> {selectedStudent.parentName || '-'}</div>
                    <div className="mb-2"><strong>Parent Email:</strong> {selectedStudent.parentEmail || '-'}</div>
                    <div className="mb-2"><strong>Parent Phone:</strong> {selectedStudent.parentPhone || '-'}</div>
                    <div className="mb-2"><strong>Relationship:</strong> {selectedStudent.relationship || '-'}</div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseDetails}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedClass && (!studentsByClass[selectedClass] || studentsByClass[selectedClass].length === 0) && (
            <div className="text-center text-muted py-4">No students in this class.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentList;


