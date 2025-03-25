import React, { ChangeEvent, useState } from "react";
import { Save, UserPlus, Receipt } from "lucide-react";
import { db } from "../firebase";
//import { collection, addDoc } from "firebase/firestore";
import { collection, doc, setDoc } from "firebase/firestore";

import "bootstrap/dist/css/bootstrap.min.css";

interface StudentForm {
  studentName: string;
  studentId: string;
  classId: string;
  birthDate: string;
  age: string;
  address: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

function generateStudentId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(2, "0");
  return `${year}K${random}`;
}

function StudReg() {
  const [formData, setFormData] = useState<StudentForm>(() => {
    const studId = generateStudentId();
    return {
      studentName: "",
      studentId: studId,
      birthDate: "",
      age: "",
      classId: "",
      address: "",
      parentId: "P" + studId,
      parentName: "",
      parentPhone: "",
      parentEmail: "",
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // Student ID is now read-only, so we don't need to handle its changes
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Automatically calculate age when birthdate changes
    if (name === "birthDate") {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      setFormData((prev) => ({
        ...prev,
        age: age.toString(),
      }));
    }
  };
  const classArray = ["3Y", "4Y", "5Y", "6Y"]; // Class options

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create student document in students collection
      const studentDocRef = doc(
        collection(db, "students"),
        formData.studentId
      );
      await setDoc(studentDocRef, {
        name: formData.studentName,
        parentId: formData.parentId,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        birthDate: formData.birthDate,
        age: formData.age,
        class_id: formData.classId,
      });

      // Create student document in class's student subcollection
      const classStudentRef = doc(
        collection(db, "classes", formData.classId, "students"),
        formData.studentId
      );
      await setDoc(classStudentRef, {
        name: formData.studentName,
        parentId: formData.parentId,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        birthDate: formData.birthDate,
        age: formData.age,
      });

      // Create parent document
      const parentDocRef = doc(collection(db, "parents"), formData.parentId);
      await setDoc(
        parentDocRef,
        {
          name: formData.parentName,
          parentId: formData.parentId,
          email: formData.parentEmail,
          phone: formData.parentPhone,
          student_id: [formData.studentId],
        },
        { merge: true }
      );

      alert("Registration successful!");

      // Reset form with new IDs
      const newStudId = generateStudentId();
      setFormData({
        studentName: "",
        studentId: newStudId,
        birthDate: "",
        age: "",
        classId: "",
        parentId: "P" + newStudId,
        address: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
      });
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="container max-w-6xl">
        <main className="bg-white rounded shadow p-5">
          <div className="mb-4 d-flex align-items-center justify-content-between">
            {" "}
            {/* Bootstrap flexbox */}
            <div>
              <h2 className="h3 fw-bold">New Student Registration</h2>{" "}
              {/* Bootstrap heading */}
              <p className="text-muted mt-1">
                Fill in the student's information below
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-danger" />{" "}
            {/* Lucide icon with Bootstrap color */}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <h3 className="h4 fw-semibold mb-3">Student Information</h3>{" "}
              {/* Bootstrap heading */}
              <div className="row g-3">
                {" "}
                {/* Bootstrap grid with gutters */}
                <div className="col-md-6">
                  {" "}
                  {/* First column */}
                  <label className="form-label" htmlFor="studentName">
                    Student Name
                  </label>{" "}
                  {/* Bootstrap label */}
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    } // Typed event
                    className="form-control"
                    required
                    id="studentName"
                  />
                </div>
                <div className="col-md-6">
                  {" "}
                  {/* Second column */}
                  <label className="form-label" htmlFor="studentId">
                    Student ID
                  </label>
                  <div>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      className="form-control bg-light"
                      readOnly
                      id="studentId"
                    />
                    <div className="form-text">Auto-generated ID</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="birthDate">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="birthDate"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="age">
                    Age
                  </label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control bg-light"
                    readOnly
                    id="age"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="classId">
                    Class
                  </label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    className="form-select"
                    required
                    id="classId"
                  >
                    <option value="">Select Class</option>
                    {classArray.map((className) => (
                      <option key={className} value={className}>
                        {className} {/* Display the class name */}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-12">
                  {" "}
                  {/* Span two columns on medium and up */}
                  <label className="form-label" htmlFor="address">
                    Home Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      handleChange(e)
                    } // Correct type for textarea
                    className="form-control"
                    rows={3}
                    required
                    id="address"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information Section */}
            <div className="mb-3">
              <h3 className="h4 fw-semibold mb-3">
                Parent/Guardian Information
              </h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentName">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentName"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentId">
                    Parent ID
                  </label>
                  <div>
                    <input
                      type="text"
                      name="parentId"
                      value={formData.parentId}
                      className="form-control bg-light"
                      readOnly
                      id="parentId"
                    />
                    <div className="form-text">Auto-generated ID</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentPhone">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentPhone"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentEmail">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentEmail"
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-3 mt-4">
              <button type="button" className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 me-2" />
                {isSubmitting ? "Registering..." : "Register Student"}
              </button>
            </div>
          </form>
        </main>

        <footer className="mt-4 d-flex justify-content-between align-items-center text-sm text-muted">
          <span>KinderCare Admin</span>
          <div className="d-flex align-items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span>Need help with registration?</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default StudReg;
