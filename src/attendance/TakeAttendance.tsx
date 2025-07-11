"use client"

import { useState, useEffect } from "react"
import {
  Typography, Button, Select, MenuItem,
  FormControl, InputLabel, Avatar
} from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import SaveIcon from "@mui/icons-material/Save"
import GroupIcon from "@mui/icons-material/Group"
import { Link } from "react-router-dom"
import { db } from "../firebase"
import { collection, getDocs, doc, setDoc } from "firebase/firestore"
import "./TakeAttendance.css"

// Interface for class data
interface ClassData {
  id: string;
  name: string;
  students: number;
}

// Interface for student data
interface StudentData {
  id: string;
  name: string;
  studentID: string;
  photo?: string;
}

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState("")
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "on leave">>({})
  const [isSaving, setIsSaving] = useState(false)
  const [classes, setClasses] = useState<ClassData[]>([])
  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch classes from database
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesCollection = collection(db, "classes")
        const classesSnapshot = await getDocs(classesCollection)
        
        const classesData: ClassData[] = []
        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          const classId = doc.id
          const className = data.name || doc.id
          
          // Debug: Log each class ID to see what's in the database
          console.log("Class ID from DB:", classId, "Type:", typeof classId)
          console.log("Class Name from DB:", className, "Type:", typeof className)
          
          classesData.push({
            id: classId,
            name: className,
            students: data.studentCount || 0
          })
        })
        
        setClasses(classesData)
      } catch (error) {
        console.error("Error fetching classes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [])

  // Fetch students when class is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([])
        return
      }

      try {
        setLoading(true)
        const studentsCollection = collection(db, "classes", selectedClass, "students")
        const studentsSnapshot = await getDocs(studentsCollection)
        
        const studentsData: StudentData[] = []
        studentsSnapshot.forEach((doc) => {
          const data = doc.data()
          studentsData.push({
            id: doc.id,
            name: data.name || "Unknown Student",
            studentID: data.studentID || doc.id,
            photo: data.photo || "/placeholder.svg?height=40&width=40"
          })
        })
        
        setStudents(studentsData)
      } catch (error) {
        console.error("Error fetching students:", error)
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass])

  const handleAttendanceChange = (studentId: string, status: "present" | "absent" | "on leave") => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSaveAttendance = async () => {
    setIsSaving(true)
    try {
      // Get current date in yyyy-mm-dd format
      const today = new Date()
      const dateString = today.toISOString().split('T')[0]
      
      // Ensure class ID is stored as clean string without any formatting
      

      
      // Save attendance for each student
      const savePromises = Object.entries(attendance).map(async ([studentId, status]) => {
        const student = students.find(s => s.id === studentId)
        if (!student) return
      
        
        console.log("Saving to path:", `attendance/${selectedClass}/${dateString}/${studentId}`)

       const studentDocRef = doc(
          db,
          "attendance",
          selectedClass,   // "3Y" (collection)
          dateString,      // "2025-07-02" (collection)
          studentId        // doc
        );
        await setDoc(studentDocRef, {
          studentId: studentId,
          name: student.name,
          status: status,
          timestamp: today.toISOString()
        })
      })
      await Promise.all(savePromises)
      alert("Attendance saved successfully!")
      
      // Reset attendance after saving
      setAttendance({})
    } catch (error) {
      console.error("Error saving attendance:", error)
      alert("Error saving attendance. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const getAttendanceStats = () => {
    const total = students.length
    const present = Object.values(attendance).filter((status) => status === "present").length
    const absent = Object.values(attendance).filter((status) => status === "absent").length
    const onLeave = Object.values(attendance).filter((status) => status === "on leave").length
    return { total, present, absent, onLeave }
  }

  const stats = getAttendanceStats()

  if (loading && classes.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ width: "90%", maxWidth: "none", margin: "0 auto", padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <Button component={Link} to="/attendance/AttendanceMain" variant="outlined" size="small" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
          <div>
            <Typography variant="h4" fontWeight="bold">Take Attendance</Typography>
            <Typography color="textSecondary">
              Mark attendance for today - {new Date().toLocaleDateString()}
            </Typography>
          </div>
        </div>

        {/* Class Selection */}
        <div style={{ 
          marginBottom: "24px", 
          boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
          borderRadius: "4px",
          backgroundColor: "white",
          padding: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
            <GroupIcon style={{ marginRight: "8px" }} />
            <Typography variant="h6">Select Class</Typography>
          </div>
          <FormControl fullWidth>
            <InputLabel>Choose a class</InputLabel>
            <Select
              value={selectedClass}
              label="Choose a class"
              onChange={e => setSelectedClass(e.target.value)}
            >
              {classes.map(classItem => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  {classItem.name} 
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {selectedClass && (
          <>
            {/* Attendance Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
              <div style={{ 
                flex: "1 1 150px", 
                minWidth: "150px", 
                boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
                borderRadius: "4px",
                backgroundColor: "white",
                padding: "16px",
                textAlign: "center"
              }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Students</Typography>
              </div>
              <div style={{ 
                flex: "1 1 150px", 
                minWidth: "150px", 
                boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
                borderRadius: "4px",
                backgroundColor: "white",
                padding: "16px",
                textAlign: "center"
              }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.present}
                </Typography>
                <Typography variant="body2" color="text.secondary">Present</Typography>
              </div>
              <div style={{ 
                flex: "1 1 150px", 
                minWidth: "150px", 
                boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
                borderRadius: "4px",
                backgroundColor: "white",
                padding: "16px",
                textAlign: "center"
              }}>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {stats.absent}
                </Typography>
                <Typography variant="body2" color="text.secondary">Absent</Typography>
              </div>
              <div style={{ 
                flex: "1 1 150px", 
                minWidth: "150px", 
                boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
                borderRadius: "4px",
                backgroundColor: "white",
                padding: "16px",
                textAlign: "center"
              }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.onLeave}
                </Typography>
                <Typography variant="body2" color="text.secondary">On Leave</Typography>
              </div>
            </div>

            {/* Student List */}
            <div style={{ 
              boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
              borderRadius: "4px",
              backgroundColor: "white",
              padding: "16px"
            }}>
              <div style={{ marginBottom: "16px" }}>
                <Typography variant="h6">Student Attendance</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mark attendance for {classes.find((c) => c.id === selectedClass)?.name}
                </Typography>
              </div>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                  <Typography>Loading students...</Typography>
                </div>
              ) : students.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                  <Typography color="text.secondary">No students found in this class</Typography>
                </div>
              ) : (
                <div>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        marginBottom: "16px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <Avatar
                          alt={student.name}
                          src={student.photo || "/placeholder.svg"}
                          style={{ width: 40, height: 40 }}
                        />
                        <div>
                          <Typography variant="h6">{student.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Student ID: {student.studentID}
                          </Typography>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          variant={attendance[student.id] === "present" ? "contained" : "outlined"}
                          color="success"
                          size="small"
                          onClick={() => handleAttendanceChange(student.id, "present")}
                        >
                          Present
                        </Button>
                        <Button
                          variant={attendance[student.id] === "on leave" ? "contained" : "outlined"}
                          color="warning"
                          size="small"
                          onClick={() => handleAttendanceChange(student.id, "on leave")}
                        >
                          On Leave
                        </Button>
                        <Button
                          variant={attendance[student.id] === "absent" ? "contained" : "outlined"}
                          color="error"
                          size="small"
                          onClick={() => handleAttendanceChange(student.id, "absent")}
                        >
                          Absent
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <Button
                  onClick={handleSaveAttendance}
                  disabled={
                    isSaving ||
                    students.length === 0 ||
                    Object.keys(attendance).length !== students.length
                  }
                  startIcon={<SaveIcon />}
                  variant="contained"
                  color="primary"
                >
                  {isSaving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
