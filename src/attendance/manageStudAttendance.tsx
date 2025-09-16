import React, { useState, useEffect } from "react";
import {
  Typography, Chip, CircularProgress, IconButton, Card, CardContent, Button
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';

// Helper function to get current week (Monday to Friday)
function getCurrentWeek(): string {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

// Helper function to get week dates (Monday to Friday)
function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 5; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper function to get week range label
function getWeekRangeLabel(startDate: string): string {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(start.getDate() + 4);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AttendanceDataService from "./attendanceService";

interface ClassData {
  id: string;
  name: string;
  students: number;
  present: number;
  grade: string;
}

interface StudentData {
  id: string;
  name: string;
  class_id: string;
  grade?: string;
}

// Student shape returned by AttendanceDataService.fetchClassAttendance
type AttendanceStudent = {
  id: string;
  status: string;
  reason?: string;
};

interface WeeklyAttendanceData {
  [date: string]: {
    status: string;
    note?: string;
  };
}

interface StudentWeeklyAttendance {
  studentId: string;
  studentName: string;
  weeklyData: WeeklyAttendanceData;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalDays: number;
}

const ManageStudentAttendance: React.FC = () => {
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [selectedManageClass, setSelectedManageClass] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentWeeklyAttendance, setStudentWeeklyAttendance] = useState<StudentWeeklyAttendance | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeek());
  const [loadingManageData, setLoadingManageData] = useState(false);

  // Fetch all classes for management
  const fetchAllClasses = async () => {
    try {
      const classesSnapshot = await getDocs(collection(db, "attendance"));
      const classIds = classesSnapshot.docs.map(doc => doc.id);
      const classData: ClassData[] = [];
      for (const classId of classIds) {
        const classStudentsSnapshot = await getDocs(
          query(collection(db, "students"), where("class_id", "==", classId))
        );
        classData.push({
          id: classId,
          name: classId,
          students: classStudentsSnapshot.size,
          present: 0,
          grade: "N/A"
        });
      }
      setAllClasses(classData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Handle class selection in manage attendance
  const handleManageClassSelect = async (classId: string) => {
    setSelectedManageClass(classId);
    setLoadingManageData(true);
    setSelectedStudent(null);
    setStudentWeeklyAttendance(null);
    try {
      const studentsSnapshot = await getDocs(
        query(collection(db, "students"), where("class_id", "==", classId))
      );
      const students: StudentData[] = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        class_id: classId,
        grade: doc.data().grade || 'N/A'
      }));
      setClassStudents(students);
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    } finally {
      setLoadingManageData(false);
    }
  };

  // Handle week change
  const handleWeekChange = (weekStart: string) => {
    setSelectedWeek(weekStart);
    if (selectedStudent) {
      // handleStudentSelect(selectedStudent); // This line is removed
    }
  };

  // Week navigation logic
  const goToPreviousWeek = () => {
    const prev = new Date(selectedWeek);
    prev.setDate(prev.getDate() - 7);
    handleWeekChange(prev.toISOString().split('T')[0]);
  };
  const goToNextWeek = () => {
    const next = new Date(selectedWeek);
    next.setDate(next.getDate() + 7);
    const today = new Date();
    const thisMonday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    thisMonday.setDate(diff);
    if (next <= thisMonday) {
      handleWeekChange(next.toISOString().split('T')[0]);
    }
  };
  const isNextWeekDisabled = (() => {
    const today = new Date();
    const thisMonday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    thisMonday.setDate(diff);
    return new Date(selectedWeek).getTime() >= thisMonday.getTime();
  })();

  // Get status color for weekly view
  const getWeeklyStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'on leave': return 'info';
      default: return 'default';
    }
  };
  // Get status icon for weekly view
  const getWeeklyStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <span style={{ color: 'green', fontWeight: 'bold' }}>●</span>;
      case 'absent': return <span style={{ color: 'red', fontWeight: 'bold' }}>●</span>;
      case 'on leave': return <span style={{ color: 'blue', fontWeight: 'bold' }}>●</span>;
      default: return <span style={{ color: 'grey' }}>○</span>;
    }
  };

  useEffect(() => {
    fetchAllClasses();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    if (selectedManageClass) {
      handleManageClassSelect(selectedManageClass);
    } else {
      setClassStudents([]);
      setSelectedStudent(null);
      setStudentWeeklyAttendance(null);
    }
  }, [selectedManageClass]);

  // Fetch weekly attendance for selected student
  useEffect(() => {
    const fetchWeeklyAttendance = async () => {
      if (!selectedStudent || !selectedManageClass) {
        setStudentWeeklyAttendance(null);
        return;
      }
      setLoadingManageData(true);
      try {
        const weekDates = getWeekDates(selectedWeek);
        const weeklyData: WeeklyAttendanceData = {};
        let presentDays = 0, absentDays = 0, leaveDays = 0;
        for (const date of weekDates) {
          try {
            const result = await AttendanceDataService.fetchClassAttendance(selectedManageClass, date);
            const studentAttendance = (result.students as AttendanceStudent[]).find(s => s.id === selectedStudent);
            if (studentAttendance) {
              weeklyData[date] = {
                status: studentAttendance.status,
                note: studentAttendance.reason || ''
              };
              if (studentAttendance.status === 'present') presentDays++;
              else if (studentAttendance.status === 'absent') absentDays++;
              else if (studentAttendance.status === 'on leave') leaveDays++;
            } else {
              weeklyData[date] = {
                status: 'not marked',
                note: ''
              };
            }
          } catch (error) {
            console.error(`Error fetching attendance for ${date}:`, error);
            weeklyData[date] = {
              status: 'not marked',
              note: ''
            };
          }
        }
        const student = classStudents.find(s => s.id === selectedStudent);
        setStudentWeeklyAttendance(student
          ? {
              studentId: selectedStudent,
              studentName: student.name,
              weeklyData,
              presentDays,
              absentDays,
              leaveDays,
              totalDays: weekDates.length
            }
          : null
        );
      } catch (error) {
        console.error('Error fetching student weekly attendance:', error);
      } finally {
        setLoadingManageData(false);
      }
    };
    fetchWeeklyAttendance();
  }, [selectedStudent, selectedManageClass, selectedWeek, classStudents]);

  return (
    <div>
      <div style={{ width: "90%", maxWidth: "none", margin: "0 auto", padding: "24px 24px 0 24px" }}>
        <Button
          component={Link}
          to="/attendance/AttendanceMain"
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
      </div>
      <div className="container py-4">
        <div className="bg-white rounded shadow p-4">
          <div className="d-flex align-items-center mb-4">
            <Typography variant="h5" fontWeight="bold" gutterBottom style={{ margin: 0 }}>
              Student Attendance
            </Typography>
          </div>
          {/* Class Selection Dropdown styled like parentList.tsx */}
          <div className="mb-4">
            <label htmlFor="classSelect" className="form-label">Select Class:</label>
            <select
              id="classSelect"
              className="form-select"
              value={selectedManageClass || ""}
              onChange={e => setSelectedManageClass(e.target.value)}
            >
              <option value="" disabled>All Class</option>
              {allClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
            {/* Student List - 1/3 width */}
            <div style={{ 
              flex: '1', 
              borderRight: '1px solid #e0e0e0', 
              paddingRight: '16px' 
            }}>
              <Typography variant="h6" style={{ marginBottom: '16px' }}>Select Student</Typography>
              {/* ... rest of student list unchanged ... */}
              {!selectedManageClass ? (
                <Typography variant="body2" color="text.secondary" align="center" style={{ padding: '20px' }}>
                  Please select a class first
                </Typography>
              ) : loadingManageData ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <CircularProgress />
                </div>
              ) : classStudents.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" style={{ padding: '20px' }}>
                  No students found in this class
                </Typography>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {classStudents.map((student) => (
                    <Card 
                      key={student.id}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedStudent === student.id ? '#f0f0f0' : 'white',
                        border: selectedStudent === student.id ? '2px solid #1976d2' : '1px solid #e0e0e0'
                      }}
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <CardContent style={{ padding: '12px' }}>
                        <Typography variant="subtitle1" fontWeight="bold">{student.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {student.id}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Weekly Attendance - 2/3 width */}
            <div style={{ flex: '2' }}>
              <Typography variant="h6" style={{ marginBottom: '16px' }}>Weekly Attendance</Typography>
              {!selectedStudent ? (
                <Typography variant="body2" color="text.secondary" align="center" style={{ padding: '20px' }}>
                  Please select a student first
                </Typography>
              ) : (
                <div>
                  {/* Overall Attendance Status and Week Selector in the same row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    {/* Status Chips */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Chip label={`Present: ${studentWeeklyAttendance?.presentDays || 0}`} color="success" />
                      <Chip label={`Absent: ${studentWeeklyAttendance?.absentDays || 0}`} color="error" />
                      <Chip label={`Leave: ${studentWeeklyAttendance?.leaveDays || 0}`} color="info" />
                    </div>
                    {/* Week Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconButton
                        onClick={goToPreviousWeek}
                        size="small"
                      >
                        &lt;
                      </IconButton>
                      <span style={{ fontSize: 14 }}>{getWeekRangeLabel(selectedWeek)}</span>
                      <IconButton
                        onClick={goToNextWeek}
                        disabled={isNextWeekDisabled}
                        size="small"
                      >
                        &gt;
                      </IconButton>
                    </div>
                  </div>
                  {loadingManageData ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <CircularProgress />
                    </div>
                  ) : studentWeeklyAttendance ? (
                    <div>
                      {/* Weekly Schedule */}
                      <div>
                        <Typography variant="subtitle1" style={{ marginBottom: '8px' }}>Weekly Schedule</Typography>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {getWeekDates(selectedWeek).map((date, index) => {
                            const dayData = studentWeeklyAttendance.weeklyData[date];
                            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                            const dayName = dayNames[index];
                            const formattedDate = new Date(date).toLocaleDateString();
                            return (
                              <div key={date}>
                                <Card>
                                  <CardContent style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div>
                                        <Typography variant="subtitle2" fontWeight="bold">{dayName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                                      </div>
                                      
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getWeeklyStatusIcon(dayData?.status || 'not marked')}
                                        <Chip 
                                          label={dayData?.status?.toUpperCase() || 'NOT MARKED'} 
                                          color={getWeeklyStatusColor(dayData?.status || 'not marked')}
                                          size="small"
                                        />
                                      </div>
                                      
                                    </div>
                                    {(dayData?.status === 'absent' || dayData?.status === 'on leave') && dayData?.note && (
                                        <div>
                                          <Typography variant="caption" color="text.secondary" style={{ fontStyle: 'italic' }}>
                                            Reason: {dayData.note}
                                          </Typography>
                                        </div>
                                      )}
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" style={{ padding: '20px' }}>
                      No attendance data available
                    </Typography>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageStudentAttendance;
