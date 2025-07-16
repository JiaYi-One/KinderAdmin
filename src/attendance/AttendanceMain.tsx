"use client"
import { useState, useEffect } from "react";
import {
  Typography, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemIcon, IconButton
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AttendanceDataService from "./attendanceService";
import type { ChipProps } from '@mui/material';

// Types for real data
interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  todayAttendance: number;
  attendanceRate: number;
}

interface ClassData {
  id: string;
  name: string;
  students: number;
  present: number;
  grade: string;
}

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClasses: 0,
    todayAttendance: 0,
    attendanceRate: 0,
  });
  const [recentClasses, setRecentClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWeekend, setIsWeekend] = useState(false);
  
  // Dialog states
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Check if today is weekend
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 6 = Saturday
        const weekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // If it's weekend, show no attendance
        const displayDate = today;
        
        setIsWeekend(weekend);
        
        if (weekend) {
          // Don't fetch any attendance data on weekends
          setDashboardStats({
            totalStudents: 0,
            totalClasses: 0,
            todayAttendance: 0,
            attendanceRate: 0,
          });
          setRecentClasses([]);
          setLoading(false);
          return;
        }

        // Fetch all classes
        const classesSnapshot = await getDocs(collection(db, "attendance"));
        const classIds = classesSnapshot.docs.map(doc => doc.id);
        
        console.log('Found classes:', classIds);

        // Fetch students count
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const totalStudents = studentsSnapshot.size;

        // Fetch attendance for all classes (using displayDate instead of today)
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLeave = 0;
        const classData: ClassData[] = [];

        for (const classId of classIds) {
          try {
            const attendanceResult = await AttendanceDataService.fetchClassAttendance(classId, displayDate);
            
            // Get class details from students collection
            const classStudentsSnapshot = await getDocs(
              query(collection(db, "students"), where("class_id", "==", classId))
            );
            
            const classStudents = classStudentsSnapshot.docs;
            const grade = classStudents.length > 0 ? classStudents[0].data()?.grade || "N/A" : "N/A";
            
            classData.push({
              id: classId,
              name: classId, // Using classId as name for now
              students: classStudents.length,
              present: attendanceResult.present,
              grade: grade
            });

            totalPresent += attendanceResult.present;
            totalAbsent += attendanceResult.absent;
            totalLeave += attendanceResult.leave;
          } catch (error) {
            console.error(`Error fetching attendance for class ${classId}:`, error);
            // Add class with zero attendance if there's an error
            classData.push({
              id: classId,
              name: classId,
              students: 0,
              present: 0,
              grade: "N/A"
            });
          }
        }

        const totalAttendance = totalPresent + totalAbsent + totalLeave;
        const attendanceRate = totalAttendance > 0 ? (totalPresent / totalAttendance) * 100 : 0;

        setDashboardStats({
          totalStudents,
          totalClasses: classIds.length,
          todayAttendance: totalPresent,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        });

        setRecentClasses(classData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle class click to show student details
  const handleClassClick = async (classId: string) => {
    setSelectedClass(classId);
    setLoadingStudents(true);
    
    try {
      // Get today's date or last Friday if weekend
      const today = new Date();
      const dayOfWeek = today.getDay();
      let displayDate = today.toISOString().split('T')[0];
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const lastFriday = new Date(today);
        const daysToSubtract = dayOfWeek === 0 ? 2 : 1;
        lastFriday.setDate(today.getDate() - daysToSubtract);
        displayDate = lastFriday.toISOString().split('T')[0];
      }
      
      const result = await AttendanceDataService.fetchClassAttendance(classId, displayDate);
      setStudents(result.students);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedClass(null);
    setStudents([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircleIcon color="success" />;
      case 'absent': return <CancelIcon color="error" />;
      case 'on leave': return <EventBusyIcon color="info" />;
      default: return <GroupIcon />;
    }
  };

  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'on leave': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="error">{error}</Typography>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <div style={{ width: "90%", maxWidth: "none", margin: "0 auto", padding: "24px" }}>
        <div style={{ 
          background: "#fff", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
          padding: "32px",
          minHeight: "calc(100vh - 48px)"
        }}>
          {/* Header */}
          <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Typography variant="h5" fontWeight="bold" color="text.primary" >
            Attendance Management System
            </Typography>
            <Typography color="text.secondary"></Typography>
          </div>
          <div style={{ textAlign: "right" }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isWeekend ? "Weekend - No School" : "School Day"}
            </Typography>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "32px" }}>
          <div style={{ 
            flex: "1 1 200px", 
            minWidth: "200px", 
            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
            borderRadius: "4px",
            backgroundColor: "white",
            padding: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Typography variant="subtitle2">Total Students</Typography>
              <GroupIcon color="action" />
            </div>
            <Typography variant="h5" fontWeight="bold">{dashboardStats.totalStudents}</Typography>
          </div>
          <div style={{ 
            flex: "1 1 200px", 
            minWidth: "200px", 
            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
            borderRadius: "4px",
            backgroundColor: "white",
            padding: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Typography variant="subtitle2">Total Classes</Typography>
              <MenuBookIcon color="action" />
            </div>
            <Typography variant="h5" fontWeight="bold">{dashboardStats.totalClasses}</Typography>
          </div>
          <div style={{ 
            flex: "1 1 200px", 
            minWidth: "200px", 
            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
            borderRadius: "4px",
            backgroundColor: "white",
            padding: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <Typography variant="subtitle2">{isWeekend ? "Weekend" : "Today's"} Attendance</Typography>
            <CalendarMonthIcon color="action" />
          </div>
          <Typography variant="h5" fontWeight="bold">{isWeekend ? "--" : dashboardStats.todayAttendance}</Typography>
          <Typography variant="caption" color="text.secondary">
            {isWeekend ? "No school on weekends" : `out of ${dashboardStats.totalStudents} students`}
          </Typography>
          </div>
          <div style={{ 
            flex: "1 1 200px", 
            minWidth: "200px", 
            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
            borderRadius: "4px",
            backgroundColor: "white",
            padding: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Typography variant="subtitle2">Attendance Rate</Typography>
              <TrendingUpIcon color="action" />
            </div>
            <Typography variant="h5" fontWeight="bold">{dashboardStats.attendanceRate}%</Typography>
            <Typography variant="caption" color="success.main">
              Today's overall rate
            </Typography>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "32px" }}>
          <div 
            style={{ 
              flex: "1 1 300px",
              minWidth: "300px",
              height: "100px", 
              textAlign: "left", 
              textDecoration: "none",
              cursor: "pointer",
              boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
              borderRadius: "4px",
              backgroundColor: "white",
              padding: "16px",
              transition: "box-shadow 0.3s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.16), 0 6px 12px rgba(0,0,0,0.23)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)"}
          >
            <Link to="/attendance/TakeAttendance" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <CalendarMonthIcon style={{ color: "#1976d2" }} />
                <Typography variant="h6">Take Attendance</Typography>
              </div>
              <Typography variant="body2" color="text.secondary">
                Mark attendance with pre-notified absences
              </Typography>
            </Link>
          </div>
          <div 
            style={{ 
              flex: "1 1 300px",
              minWidth: "300px",
              height: "100px", 
              textAlign: "left", 
              textDecoration: "none",
              cursor: "pointer",
              boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
              borderRadius: "4px",
              backgroundColor: "white",
              padding: "16px",
              transition: "box-shadow 0.3s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.16), 0 6px 12px rgba(0,0,0,0.23)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)"}
          >
            <Link to="/attendance/AttendanceReport" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <TrendingUpIcon style={{ color: "#2e7d32" }} />
                <Typography variant="h6">View Reports</Typography>
              </div>
              <Typography variant="body2" color="text.secondary">
                Daily, weekly & monthly reports
              </Typography>
            </Link>
          </div>
        </div>

        {/* Recent Classes */}
        <div style={{ 
          boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
          borderRadius: "4px",
          backgroundColor: "white",
          padding: "16px"
        }}>
          <div style={{ marginBottom: "16px" }}>
            <Typography variant="h6">{isWeekend ? "Weekend" : "Today's"} Class Attendance</Typography>
            <Typography variant="body2" color="text.secondary">
              {isWeekend ? "No classes on weekends" : "Overview of attendance for all classes"}
            </Typography>
          </div>
          <div>
            {isWeekend ? (
              <Typography variant="body2" color="text.secondary" align="center" style={{ padding: "20px" }}>
                School is closed on weekends. No attendance data available.
              </Typography>
            ) : recentClasses.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" style={{ padding: "20px" }}>
                No class data available
              </Typography>
            ) : (
              recentClasses.map((classItem) => (
                <div
                  key={classItem.id}
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
                  <div>
                    <Typography fontWeight="bold">{classItem.name}</Typography>
                   
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ textAlign: "right" }}>
                      <Typography fontWeight="bold">
                        {classItem.present}/{classItem.students}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Present/Total
                      </Typography>
                    </div>
                    <Chip
                      label={`${classItem.students > 0 ? Math.round((classItem.present / classItem.students) * 100) : 0}%`}
                      color={classItem.present === classItem.students ? "success" : "default"}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleClassClick(classItem.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={Boolean(selectedClass)} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedClass} - Student Attendance ({isWeekend ? "Last Friday" : "Today"})
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Typography variant="body1" color="text.secondary">
                Loading students...
              </Typography>
            </div>
          ) : (
            <List>
              {students.map((student) => (
                <ListItem key={student.id} divider>
                  <ListItemIcon>
                    {getStatusIcon(student.status)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={student.name}
                    secondary={`Student ID: ${student.id}`}
                  />
                  <Chip 
                    label={student.status.toUpperCase()} 
                    color={getStatusColor(student.status)}
                    size="small"
                  />
                </ListItem>
              ))}
              {students.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No students found for this class on the selected date.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
