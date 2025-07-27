import React, { useState, useEffect } from "react";
import {
  Typography, Chip, CircularProgress, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, TextField
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AttendanceDataService from "./attendanceService";

interface LeaveApplicationData {
  id: string;
  absenceType: string;
  classId: string;
  documents?: {
    endDate: string;
    parentId: string;
    reason: string;
    startDate: string;
    status: string;
    studentId: string;
    studentName: string;
    submittedAt: string;
    workingDays: number;
  };
  studentId?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  submittedAt?: string;
}

interface ClassData {
  id: string;
  name: string;
  students: number;
  grade: string;
}


interface LeaveStudentData {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  leaveDate: string;
  status: string;
  reason?: string;
}

const StudOnLeave: React.FC = () => {
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveStudents, setLeaveStudents] = useState<LeaveStudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLeaveStudents, setTotalLeaveStudents] = useState(0);

  // Fetch all classes
  useEffect(() => {
    const fetchAllClasses = async () => {
      try {
        const classesSnapshot = await getDocs(collection(db, "attendance"));
        const classIds = classesSnapshot.docs.map(doc => doc.id);
        const classData: ClassData[] = [];
        
        for (const classId of classIds) {
          const classStudentsSnapshot = await getDocs(
            query(collection(db, "students"), where("class_id", "==", classId))
          );
          const grade = classStudentsSnapshot.docs.length > 0 ? 
            classStudentsSnapshot.docs[0].data()?.grade || "N/A" : "N/A";
          
          classData.push({
            id: classId,
            name: classId,
            students: classStudentsSnapshot.size,
            grade: grade
          });
        }
        setAllClasses(classData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchAllClasses();
  }, []);

  // Fetch students on leave
  useEffect(() => {
    const fetchLeaveStudents = async () => {
      setLoading(true);
      try {
        const classesToCheck = selectedClass === "all" ? 
          allClasses.map(cls => cls.id) : [selectedClass];

        // First, get students on leave from attendance data
        const attendancePromises = classesToCheck.map(async (classId) => {
          try {
            const result = await AttendanceDataService.fetchClassAttendance(classId, selectedDate);
            const leaveStudentsInClass = result.students.filter(student => 
              student.status === "on leave"
            );

            return leaveStudentsInClass.map(student => {
              const className = allClasses.find(cls => cls.id === classId)?.name || classId;
              return {
                studentId: student.id,
                studentName: student.name,
                classId: classId,
                className: className,
                leaveDate: selectedDate,
                status: student.status,
                reason: ""
              };
            });
          } catch (error) {
            console.error(`Error fetching leave data for class ${classId}:`, error);
            return [];
          }
        });

        // Wait for all attendance API calls to complete in parallel
        const attendanceResults = await Promise.all(attendancePromises);
        const allLeaveStudents = attendanceResults.flat();

        // Now fetch leave application details for these students
        const leaveDetailsPromises = allLeaveStudents.map(async (student) => {
          try {
            console.log(`Fetching leave details for student: ${student.studentId} (${student.studentName})`);
            
            // Get all leave applications and filter client-side for better debugging
            const leaveQuery = query(collection(db, "leave_applications"));
            const leaveSnapshot = await getDocs(leaveQuery);
            
            let leaveReason = "No reason provided";
            const matchingApplications: LeaveApplicationData[] = [];
            
            // Filter documents that match our student
            leaveSnapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log(`Checking document ${doc.id}:`, data);
              
              // Check different possible structures
              if (data.documents && data.documents.studentId === student.studentId) {
                console.log(`Found matching student in document ${doc.id} via documents.studentId`);
                matchingApplications.push({
                    id: doc.id, ...data,
                    absenceType: "",
                    classId: ""
                });
              } else if (data.studentId === student.studentId) {
                console.log(`Found matching student in document ${doc.id} via direct studentId`);
                matchingApplications.push({
                    id: doc.id, ...data,
                    absenceType: "",
                    classId: ""
                });
              }
            });
            
            console.log(`Found ${matchingApplications.length} matching applications for student ${student.studentId}`);
            
            if (matchingApplications.length > 0) {
              // Sort by submittedAt to get the most recent
              matchingApplications.sort((a, b) => {
                const dateA = a.documents?.submittedAt || a.submittedAt || '1970-01-01';
                const dateB = b.documents?.submittedAt || b.submittedAt || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              });
              
              const latestLeave = matchingApplications[0];
              console.log(`Latest leave application for ${student.studentId}:`, latestLeave);
              
              // Get dates from the correct structure
              const leaveData = latestLeave.documents || latestLeave;
              const startDateStr = leaveData.startDate || latestLeave.startDate;
              const endDateStr = leaveData.endDate || latestLeave.endDate;
              
              if (startDateStr && endDateStr) {
                // Parse dates more carefully
                const startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);
                const selectedDateObj = new Date(selectedDate);
                
                // Reset time to midnight for accurate date comparison
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                selectedDateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
                
                console.log(`Leave period: ${startDate.toDateString()} to ${endDate.toDateString()}`);
                console.log(`Selected date: ${selectedDateObj.toDateString()}`);
                console.log(`Date comparison: ${selectedDateObj.getTime()} >= ${startDate.getTime()} && ${selectedDateObj.getTime()} <= ${endDate.getTime()}`);
                
                // Check if selected date falls within the leave period
                if (selectedDateObj.getTime() >= startDate.getTime() && selectedDateObj.getTime() <= endDate.getTime()) {
                  leaveReason = leaveData.reason || latestLeave.reason || latestLeave.absenceType || "No reason provided";
                  console.log(`✅ Leave reason found for ${student.studentId}: ${leaveReason}`);
                } else {
                  console.log(`❌ Selected date ${selectedDate} is not within leave period for ${student.studentId}`);
                  // Still show the reason even if date doesn't match exactly
                  const reason = leaveData.reason || latestLeave.reason || latestLeave.absenceType || "No reason provided";
                  leaveReason = reason;
                }
              } else {
                console.log(`❌ Missing date information in leave application for ${student.studentId}`);
                leaveReason = leaveData.reason || latestLeave.reason || latestLeave.absenceType || "No reason provided";
              }
            } else {
              console.log(`❌ No leave applications found for student ${student.studentId}`);
            }
            
            return {
              ...student,
              reason: leaveReason
            };
          } catch (error) {
            console.error(`Error fetching leave details for student ${student.studentId}:`, error);
            return {
              ...student,
              reason: "Error loading reason"
            };
          }
        });

        // Wait for all leave details to be fetched
        const finalResults = await Promise.all(leaveDetailsPromises);
        
        setLeaveStudents(finalResults);
        setTotalLeaveStudents(finalResults.length);
      } catch (error) {
        console.error('Error fetching leave students:', error);
      } finally {
        setLoading(false);
      }
    };

    if (allClasses.length > 0) {
      fetchLeaveStudents();
    }
  }, [selectedClass, selectedDate, allClasses]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on leave': return 'info';
      default: return 'default';
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <div style={{ width: "90%", maxWidth: "none", margin: "0 auto", padding: "24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <Button
            component={Link}
            to="/attendance/AttendanceMain"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            style={{ marginBottom: "16px" }}
          >
            Back
          </Button>
          
          <div style={{ 
            background: "#fff", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
            padding: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <EventBusyIcon style={{ color: "#1976d2", fontSize: "32px" }} />
              <div>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  Students On Leave
                </Typography>
                <Typography color="text.secondary">
                  View and manage students who are currently on leave
                </Typography>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "24px", marginBottom: "24px", flexWrap: "wrap" }}>
              <FormControl style={{ minWidth: "200px" }}>
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClass}
                  label="Select Class"
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <MenuItem value="all">All Classes</MenuItem>
                  {allClasses.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.students} students)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Select Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: "200px" }}
              />
            </div>

            {/* Summary Card */}
            <div style={{ 
              background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)", 
              borderRadius: "8px", 
              padding: "20px", 
              marginBottom: "24px",
              color: "white"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <Typography variant="h6" style={{ color: "white", marginBottom: "4px" }}>
                    Total Students on Leave
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" style={{ color: "white" }}>
                    {totalLeaveStudents}
                  </Typography>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ textAlign: "center" }}>
                    <GroupIcon style={{ fontSize: "32px", color: "white" }} />
                    <Typography variant="body2" style={{ color: "white" }}>
                      {selectedClass === "all" ? "All Classes" : 
                        allClasses.find(cls => cls.id === selectedClass)?.name || selectedClass}
                    </Typography>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <CalendarTodayIcon style={{ fontSize: "32px", color: "white" }} />
                    <Typography variant="body2" style={{ color: "white" }}>
                      {formatDate(selectedDate)}
                    </Typography>
                  </div>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div style={{ 
              background: "#fff", 
              borderRadius: "8px", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)" 
            }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" style={{ marginTop: "16px" }}>
                    Loading students on leave...
                  </Typography>
                </div>
              ) : leaveStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <EventBusyIcon style={{ fontSize: "64px", color: "#ccc", marginBottom: "16px" }} />
                  <Typography variant="h6" color="text.secondary" style={{ marginBottom: "8px" }}>
                    No Students on Leave
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClass === "all" 
                      ? "No students are on leave across all classes on the selected date."
                      : `No students are on leave in ${allClasses.find(cls => cls.id === selectedClass)?.name || selectedClass} on the selected date.`
                    }
                  </Typography>
                </div>
              ) : (
                <TableContainer component={Paper} style={{ boxShadow: "none" }}>
                  <Table>
                    <TableHead>
                      <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell style={{ fontWeight: "bold" }}>Student Name</TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>Student ID</TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>Class</TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>Leave Date</TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>Status</TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>Leave Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaveStudents.map((student) => (
                        <TableRow key={`${student.studentId}-${student.leaveDate}`} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {student.studentName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {student.studentId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={student.className} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(student.leaveDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={student.status.toUpperCase()} 
                              color={getStatusColor(student.status)}
                              size="small"
                              icon={<EventBusyIcon />}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {student.reason || "No reason provided"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudOnLeave; 