import React, { useState, useEffect } from "react";
import {
  Typography, Chip, CircularProgress, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Dialog, DialogTitle, DialogContent, IconButton, Tooltip
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

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
  imageUrls?: string[];
}

const StudOnLeave: React.FC = () => {
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveStudents, setLeaveStudents] = useState<LeaveStudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLeaveStudents, setTotalLeaveStudents] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState<string>("");

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

  // Fetch students with leave applications
  useEffect(() => {
    const fetchLeaveStudents = async () => {
      setLoading(true);
      try {
        // Get leave applications directly from Firestore
        const leaveQuery = query(collection(db, "leave_applications"));
        const leaveSnapshot = await getDocs(leaveQuery);
        
        const leaveStudents: LeaveStudentData[] = [];
        
        leaveSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const studentId = data.studentId;
          const classId = data.classId;
          const startDate = data.startDate;
          const endDate = data.endDate;
          
          // Filter by class if specified
          if (selectedClass !== "all" && classId !== selectedClass) {
            return;
          }
          
          // Check if selected date falls within leave period
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const selected = new Date(selectedDate);
            
            // Reset time for accurate date comparison
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            selected.setHours(12, 0, 0, 0);
            
            if (selected.getTime() >= start.getTime() && selected.getTime() <= end.getTime()) {
              const className = allClasses.find(cls => cls.id === classId)?.name || classId;
              const documents = Array.isArray(data.documents) ? data.documents : [];
              
              leaveStudents.push({
                studentId: studentId,
                studentName: data.studentName || "Unknown",
                classId: classId,
                className: className,
                leaveDate: selectedDate,
                status: "on leave",
                reason: data.reason || data.absenceType || "No reason provided",
                imageUrls: documents,
              });
            }
          }
        });
        
        setLeaveStudents(leaveStudents);
        setTotalLeaveStudents(leaveStudents.length);
      } catch (error) {
        console.error('Error fetching leave applications:', error);
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
                        <TableCell style={{ fontWeight: "bold" }}>Evidence</TableCell>
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
                          <TableCell>
                            {student.imageUrls && student.imageUrls.length > 0 ? (
                              <Tooltip title="View uploaded image(s)">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => {
                                    setPreviewImages(student.imageUrls || []);
                                    setPreviewTitle(`${student.studentName} - Evidence`);
                                    setPreviewOpen(true);
                                  }}
                                >
                                  View Evidence ({student.imageUrls.length})
                                </Button>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">No image</Typography>
                            )}
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
             <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          {previewTitle}
          <IconButton onClick={() => setPreviewOpen(false)} style={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
                 <DialogContent dividers>
           {previewImages.length > 0 ? (
             <div style={{ textAlign: 'center' }}>
               <img 
                 src={previewImages[0]} 
                 alt="Evidence" 
                                   style={{ 
                    maxWidth: '100%', 
                    maxHeight: '80vh',
                    borderRadius: 8,
                    objectFit: 'contain'
                  }} 
               />
             </div>
           ) : (
             <Typography variant="body2" color="text.secondary">No images to display.</Typography>
           )}
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudOnLeave; 