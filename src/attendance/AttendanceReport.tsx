"use client"

import { useState, useEffect } from "react"
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material"
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { ChipProps } from '@mui/material';

// Utility: Get all dates in a specific week (Mon-Fri)
function getWeekDates(startDate: Date): Date[] {
  const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
  const monday = new Date(startDate);
  monday.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Utility: Get all dates in a specific month
function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  return dates;
}

// Utility: Format date as yyyy-mm-dd
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Utility: Get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

// Utility: Check if date is a weekday
function isWeekday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Tuesday = 2, ..., Friday = 5
}

// Utility: Get next weekday from a given date
function getNextWeekday(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  
  while (!isWeekday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

// Types for attendance data
interface WeeklyData {
  day: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
}



interface ClassAttendance {
  classId: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percentage: number;
}

interface Student {
  id: string;
  name: string;
  status: string;
}

interface MonthSummary {
  year: number;
  month: number;
  monthName: string;
  totalDays: number;
  presentDays: number;
  percentage: number;
  totalStudents: number;
}

export default function ReportsPage() {
  const [tab, setTab] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => {
    const today = new Date();
    // Ensure the initial date is a weekday
    if (isWeekday(today)) {
      return dayjs(today);
    } else {
      // If today is weekend, select the next weekday
      const nextWeekday = getNextWeekday(today);
      return dayjs(nextWeekday);
    }
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    return new Date(today);
  });

  const [classIDs, setClassIDs] = useState<string[]>([]);
  const [, setLoadingClasses] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    percent: 0,
  });
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    percent: 0,
  });
  const [weeklyClassAttendance, setWeeklyClassAttendance] = useState<ClassAttendance[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const [loadingDaily, setLoadingDaily] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [dayClasses, setDayClasses] = useState<ClassAttendance[]>([]);
  const [loadingDayClasses, setLoadingDayClasses] = useState(false);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthSummary[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<MonthSummary | null>(null);
  const [monthDetailsData, setMonthDetailsData] = useState<{ 
    date: string; 
    present: number; 
    absent: number; 
    late: number; 
    leave: number; 
    total: number; 
    percentage: number;
    classes: { classId: string; present: number; absent: number; late: number; leave: number; total: number; percentage: number }[];
  }[]>([]);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<{ 
    date: string; 
    classes: { 
      classId: string; 
      present: number; 
      absent: number; 
      late: number; 
      leave: number; 
      total: number; 
      percentage: number;
      students: Student[];
    }[] 
  } | null>(null);
  const [loadingDateDetails, setLoadingDateDetails] = useState(false);
  const [selectedClassForDate, setSelectedClassForDate] = useState<string | null>(null);

  // Fetch class IDs
  useEffect(() => {
    setLoadingClasses(true);
    const fetchClassIDs = async () => {
      try {
        const attendanceCol = collection(db, "attendance");
        const snapshot = await getDocs(attendanceCol);
        setClassIDs(snapshot.docs.map(doc => doc.id));
      } catch (err) {
        console.error('Error fetching class IDs:', err);
        setClassIDs([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClassIDs();
  }, []);

  // Fetch Daily Attendance for all classes
  useEffect(() => {
    if (!selectedDate || classIDs.length === 0) {
      setDailyStats({ present: 0, absent: 0, late: 0, leave: 0, total: 0, percent: 0 });
      setClassAttendance([]);
      return;
    }
    setLoadingDaily(true);
    const fetchDaily = async () => {
      try {
        let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0, totalStudents = 0;
        const classData: ClassAttendance[] = [];

        for (const classID of classIDs) {
          const studentsCol = collection(db, "attendance", classID, selectedDate.format('YYYY-MM-DD'));
          const snapshot = await getDocs(studentsCol);
          
          let present = 0, absent = 0, late = 0, leave = 0;
          snapshot.docs.forEach(doc => {
            const status = doc.data().status;
            if (status === "present") present++;
            else if (status === "absent") absent++;
            else if (status === "late") late++;
            else if (status === "leave") leave++;
          });
          
          const total = snapshot.size;
          const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
          
          classData.push({
            classId: classID,
            present,
            absent,
            late,
            leave,
            total,
            percentage
          });

          totalPresent += present;
          totalAbsent += absent;
          totalLate += late;
          totalLeave += leave;
          totalStudents += total;
        }

        const overallPercent = totalStudents ? Math.round(((totalPresent + totalLate) / totalStudents) * 100) : 0;
        setDailyStats({ 
          present: totalPresent, 
          absent: totalAbsent, 
          late: totalLate, 
          leave: totalLeave, 
          total: totalStudents, 
          percent: overallPercent 
        });
        setClassAttendance(classData);
      } catch (err) {
        console.error('Error fetching daily attendance:', err);
        setDailyStats({ present: 0, absent: 0, late: 0, leave: 0, total: 0, percent: 0 });
        setClassAttendance([]);
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchDaily();
  }, [selectedDate, classIDs]);

  // Fetch Weekly Attendance for all classes
  useEffect(() => {
    if (classIDs.length === 0) return;
    
    setLoadingWeekly(true);
    const weekDates = getWeekDates(selectedWeek);
    const fetchWeekly = async () => {
      const week: WeeklyData[] = [];
      let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0;
      const classData: ClassAttendance[] = [];
      
      // Initialize class data with unique student tracking
      const classStats: { [key: string]: { 
        present: number; 
        absent: number; 
        late: number; 
        leave: number; 
        total: number;
        uniqueStudents: Set<string>;
      } } = {};
      classIDs.forEach(classId => {
        classStats[classId] = { present: 0, absent: 0, late: 0, leave: 0, total: 0, uniqueStudents: new Set() };
      });
      
      for (const date of weekDates) {
        const yyyymmdd = formatDate(date);
        let dayPresent = 0, dayAbsent = 0, dayLate = 0, dayLeave = 0, dayTotal = 0;
        
        for (const classID of classIDs) {
          const studentsCol = collection(db, "attendance", classID, yyyymmdd);
          const snapshot = await getDocs(studentsCol);
          let classPresent = 0, classAbsent = 0, classLate = 0, classLeave = 0;
          
          snapshot.docs.forEach(doc => {
            const status = doc.data().status;
            const studentId = doc.data().studentId;
            
            // Track unique students
            classStats[classID].uniqueStudents.add(studentId);
            
            if (status === "present") {
              dayPresent++;
              classPresent++;
            } else if (status === "absent") {
              dayAbsent++;
              classAbsent++;
            } else if (status === "late") {
              dayLate++;
              classLate++;
            } else if (status === "leave") {
              dayLeave++;
              classLeave++;
            }
          });
          
          const classTotal = snapshot.size;
          classStats[classID].present += classPresent;
          classStats[classID].absent += classAbsent;
          classStats[classID].late += classLate;
          classStats[classID].leave += classLeave;
          
          dayPresent += classPresent;
          dayAbsent += classAbsent;
          dayLate += classLate;
          dayLeave += classLeave;
          dayTotal += classTotal;
        }
        
        week.push({
          day: `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })} - ${date.toLocaleDateString(undefined, { weekday: "long" })}`,
          present: dayPresent,
          absent: dayAbsent,
          late: dayLate,
          leave: dayLeave,
          total: dayTotal,
        });
        
        totalPresent += dayPresent;
        totalAbsent += dayAbsent;
        totalLate += dayLate;
        totalLeave += dayLeave;
      }
      
      // Calculate class-wise percentages using unique student counts
      Object.entries(classStats).forEach(([classId, stats]) => {
        const uniqueStudentCount = stats.uniqueStudents.size;
        const percentage = uniqueStudentCount ? Math.round(((stats.present + stats.late) / (stats.present + stats.absent + stats.late + stats.leave)) * 100) : 0;
        classData.push({
          classId,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          leave: stats.leave,
          total: uniqueStudentCount,
          percentage
        });
      });
      
      // Calculate overall unique students
      const allUniqueStudents = new Set<string>();
      Object.values(classStats).forEach(stats => {
        stats.uniqueStudents.forEach(studentId => allUniqueStudents.add(studentId));
      });
      const overallUniqueStudents = allUniqueStudents.size;
      
      const overallPercent = overallUniqueStudents ? Math.round(((totalPresent + totalLate) / (totalPresent + totalAbsent + totalLate + totalLeave)) * 100) : 0;
      setWeeklyStats({
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        leave: totalLeave,
        total: overallUniqueStudents,
        percent: overallPercent
      });
      setWeeklyClassAttendance(classData);
      setWeeklyData(week);
    };
    fetchWeekly().finally(() => setLoadingWeekly(false));
  }, [classIDs, selectedWeek]);

  // Fetch Monthly Summaries
  useEffect(() => {
    if (classIDs.length === 0) return;
    
    setLoadingMonthly(true);
    const fetchMonthlySummaries = async () => {
      const summaries: MonthSummary[] = [];
      
      // Get all 12 months of the selected year
      for (let month = 0; month < 12; month++) {
        const year = selectedYear;
        const monthDates = getMonthDates(year, month);
        
        let totalPresent = 0, totalLate = 0, totalStudents = 0;
        let presentDays = 0;
        let hasRecords = false;
        
        // Sample only weekdays (Mon-Fri) to reduce API calls
        const weekdays = monthDates.filter(date => {
          const day = date.getDay();
          return day >= 1 && day <= 5; // Monday to Friday
        });
        
        // Further reduce by sampling every 3rd day for performance
        const sampledDays = weekdays.filter((_, index) => index % 3 === 0);
        
        // Make parallel API calls instead of sequential
        const dayPromises = sampledDays.map(async (date) => {
          const yyyymmdd = formatDate(date);
          let dayPresent = 0, dayAbsent = 0, dayLate = 0, dayLeave = 0, dayTotal = 0;
          
          const classPromises = classIDs.map(async (classID) => {
            try {
              const studentsCol = collection(db, "attendance", classID, yyyymmdd);
              const snapshot = await getDocs(studentsCol);
              let classPresent = 0, classAbsent = 0, classLate = 0, classLeave = 0;
              
              snapshot.docs.forEach(doc => {
                const status = doc.data().status;
                if (status === "present") classPresent++;
                else if (status === "absent") classAbsent++;
                else if (status === "late") classLate++;
                else if (status === "leave") classLeave++;
              });
              
              return {
                present: classPresent,
                absent: classAbsent,
                late: classLate,
                leave: classLeave,
                total: snapshot.size
              };
            } catch (error) {
              console.error(`Error fetching data for ${classID} on ${yyyymmdd}:`, error);
              return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
            }
          });
          
          const classResults = await Promise.all(classPromises);
          
          classResults.forEach(result => {
            dayPresent += result.present;
            dayAbsent += result.absent;
            dayLate += result.late;
            dayLeave += result.leave;
            dayTotal += result.total;
          });
          
          return {
            present: dayPresent,
            absent: dayAbsent,
            late: dayLate,
            leave: dayLeave,
            total: dayTotal
          };
        });
        
        const dayResults = await Promise.all(dayPromises);
        
        dayResults.forEach(result => {
          if (result.total > 0) {
            totalPresent += result.present;
            totalLate += result.late;
            totalStudents += result.total;
            presentDays++;
            hasRecords = true;
          }
        });
        
        // Only add month if it has records
        if (hasRecords) {
          const percentage = totalStudents ? Math.round(((totalPresent + totalLate) / totalStudents) * 100) : 0;
          summaries.push({
            year,
            month,
            monthName: getMonthName(month),
            totalDays: monthDates.length,
            presentDays,
            percentage,
            totalStudents
          });
        }
      }
      setMonthlySummaries(summaries);
    };
    fetchMonthlySummaries().finally(() => setLoadingMonthly(false));
  }, [classIDs, selectedYear]);

  // Fetch Monthly Details
  useEffect(() => {
    if (!selectedMonthDetails || classIDs.length === 0) {
      setMonthDetailsData([]);
      return;
    }
    
    setLoadingMonthDetails(true);
    const fetchMonthDetails = async () => {
      const monthDates = getMonthDates(selectedMonthDetails.year, selectedMonthDetails.month);
      
      // Filter to only weekdays for better performance
      const weekdays = monthDates.filter(date => {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Monday to Friday
      });
      
      // Make parallel API calls for better performance
      const dayPromises = weekdays.map(async (date) => {
        const yyyymmdd = formatDate(date);
        let present = 0, absent = 0, late = 0, leave = 0, total = 0;
        
        const classPromises = classIDs.map(async (classID) => {
          try {
            const studentsCol = collection(db, "attendance", classID, yyyymmdd);
            const snapshot = await getDocs(studentsCol);
            let classPresent = 0, classAbsent = 0, classLate = 0, classLeave = 0;
            
            snapshot.docs.forEach(doc => {
              const status = doc.data().status;
              if (status === "present") classPresent++;
              else if (status === "absent") classAbsent++;
              else if (status === "late") classLate++;
              else if (status === "leave") classLeave++;
            });
            
            const classTotal = snapshot.size;
            const classPercentage = classTotal ? Math.round(((classPresent + classLate) / classTotal) * 100) : 0;
            
            return {
              classId: classID,
              present: classPresent,
              absent: classAbsent,
              late: classLate,
              leave: classLeave,
              total: classTotal,
              percentage: classPercentage
            };
          } catch (error) {
            console.error(`Error fetching data for ${classID} on ${yyyymmdd}:`, error);
            return { 
              classId: classID, 
              present: 0, 
              absent: 0, 
              late: 0, 
              leave: 0, 
              total: 0, 
              percentage: 0 
            };
          }
        });
        
        const classResults = await Promise.all(classPromises);
        
        classResults.forEach(result => {
          present += result.present;
          absent += result.absent;
          late += result.late;
          leave += result.leave;
          total += result.total;
        });
        
        const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
        return {
          date: `${date.toLocaleDateString()} (${date.toLocaleDateString(undefined, { weekday: 'long' })})`,
          present,
          absent,
          late,
          leave,
          total,
          percentage,
          classes: classResults
        };
      });
      
      const dayResults = await Promise.all(dayPromises);
      setMonthDetailsData(dayResults);
    };
    fetchMonthDetails().finally(() => setLoadingMonthDetails(false));
  }, [selectedMonthDetails, classIDs]);

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    if (direction === 'prev') {
      newWeek.setDate(newWeek.getDate() - 7);
    } else {
      newWeek.setDate(newWeek.getDate() + 7);
    }
    setSelectedWeek(newWeek);
  };

  const getWeekRange = () => {
    const weekDates = getWeekDates(selectedWeek);
    const start = weekDates[0];
    const end = weekDates[4];
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  // Fetch students for selected class
  const handleClassClick = async (classId: string) => {
    // Check if we're in weekly report and if there's data for this class
    if (tab === 1) {
      const classData = weeklyClassAttendance.find(c => c.classId === classId);
      if (!classData || classData.total === 0) {
        // No data for this class in weekly report, don't show dialog
        return;
      }
    }
    
    setSelectedClass(classId);
    setLoadingStudents(true);
    try {
      let studentsList: Student[] = [];
      
      if (tab === 1) {
        // For weekly report, fetch students for the entire week
        const weekStudents: { [key: string]: Student } = {};
        const weekDates = getWeekDates(selectedWeek);
        
        for (const date of weekDates) {
          const yyyymmdd = formatDate(date);
          try {
            const studentsCol = collection(db, "attendance", classId, yyyymmdd);
            const snapshot = await getDocs(studentsCol);
            
            snapshot.docs.forEach(doc => {
              const studentData = doc.data();
              const studentId = studentData.studentId;
              
              if (!weekStudents[studentId]) {
                weekStudents[studentId] = {
                  id: studentId,
                  name: studentData.name,
                  status: 'present' // Default status, will be updated based on attendance
                };
              }
              
              // Update status based on attendance (prioritize present > late > leave > absent)
              const currentStatus = weekStudents[studentId].status;
              const newStatus = studentData.status;
              
              if (newStatus === 'present' || 
                  (newStatus === 'late' && currentStatus !== 'present') ||
                  (newStatus === 'leave' && currentStatus !== 'present' && currentStatus !== 'late') ||
                  (newStatus === 'absent' && currentStatus !== 'present' && currentStatus !== 'late' && currentStatus !== 'leave')) {
                weekStudents[studentId].status = newStatus;
              }
            });
          } catch (error) {
            console.error(`Error fetching students for ${classId} on ${yyyymmdd}:`, error);
          }
        }
        
        studentsList = Object.values(weekStudents);
      } else {
        // For daily report, fetch students for the selected date
        const studentsCol = collection(db, "attendance", classId, selectedDate.format('YYYY-MM-DD'));
        const snapshot = await getDocs(studentsCol);
        studentsList = snapshot.docs.map(doc => ({
          id: doc.data().studentId,
          name: doc.data().name,
          status: doc.data().status
        }));
      }
      
      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDayClick = async (day: WeeklyData) => {
    setSelectedDay(day.day);
    setLoadingDayClasses(true);
    setDayClasses([]);
    
    try {
      // Find the corresponding date for this day
      const dayIndex = weeklyData.findIndex(d => d.day === day.day);
      if (dayIndex === -1) return;
      
      const weekDates = getWeekDates(selectedWeek);
      const date = weekDates[dayIndex];
      const yyyymmdd = formatDate(date);
      
      const classPromises = classIDs.map(async (classID) => {
        try {
          const studentsCol = collection(db, "attendance", classID, yyyymmdd);
          const snapshot = await getDocs(studentsCol);
          let classPresent = 0, classAbsent = 0, classLate = 0, classLeave = 0;
          
          snapshot.docs.forEach(doc => {
            const status = doc.data().status;
            if (status === "present") classPresent++;
            else if (status === "absent") classAbsent++;
            else if (status === "late") classLate++;
            else if (status === "leave") classLeave++;
          });
          
          const classTotal = snapshot.size;
          const classPercentage = classTotal ? Math.round(((classPresent + classLate) / classTotal) * 100) : 0;
          
          return {
            classId: classID,
            present: classPresent,
            absent: classAbsent,
            late: classLate,
            leave: classLeave,
            total: classTotal,
            percentage: classPercentage
          };
        } catch (error) {
          console.error(`Error fetching data for ${classID} on ${yyyymmdd}:`, error);
          return {
            classId: classID,
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            total: 0,
            percentage: 0
          };
        }
      });
      
      const classResults = await Promise.all(classPromises);
      setDayClasses(classResults);
    } catch (error) {
      console.error('Error fetching day classes:', error);
      setDayClasses([]);
    } finally {
      setLoadingDayClasses(false);
    }
  };

  const handleClassClickForSpecificDay = async (classId: string, date: string) => {
    setSelectedClass(classId);
    setLoadingStudents(true);
    setSelectedDay(null); // Close the day dialog
    
    try {
      const studentsCol = collection(db, "attendance", classId, date);
      const snapshot = await getDocs(studentsCol);
      const studentsList = snapshot.docs.map(doc => ({
        id: doc.data().studentId,
        name: doc.data().name,
        status: doc.data().status
      }));
      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCloseDayDialog = () => {
    setSelectedDay(null);
    setDayClasses([]);
  };

  const handleCloseDialog = () => {
    setSelectedClass(null);
    setStudents([]);
  };

  const handleMonthClick = (monthSummary: MonthSummary) => {
    setSelectedMonthDetails(monthSummary);
  };

  const handleCloseMonthDialog = () => {
    setSelectedMonthDetails(null);
    setMonthDetailsData([]);
  };

  const handleDateClick = async (date: string) => {
    if (!selectedMonthDetails) return;
    
    setSelectedDateDetails({ date, classes: [] });
    setSelectedClassForDate(null);
    setLoadingDateDetails(true);
    
    try {
      const yyyymmdd = formatDate(new Date(date));
      const classPromises = classIDs.map(async (classID) => {
        try {
          const studentsCol = collection(db, "attendance", classID, yyyymmdd);
          const snapshot = await getDocs(studentsCol);
          const studentsList = snapshot.docs.map(doc => ({
            id: doc.data().studentId,
            name: doc.data().name,
            status: doc.data().status
          }));
          
          // Calculate class statistics
          let present = 0, absent = 0, late = 0, leave = 0;
          studentsList.forEach(student => {
            if (student.status === "present") present++;
            else if (student.status === "absent") absent++;
            else if (student.status === "late") late++;
            else if (student.status === "leave") leave++;
          });
          
          const total = studentsList.length;
          const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
          
          return { 
            classId: classID, 
            present,
            absent,
            late,
            leave,
            total,
            percentage,
            students: studentsList 
          };
        } catch (error) {
          console.error(`Error fetching students for ${classID} on ${yyyymmdd}:`, error);
          return { 
            classId: classID, 
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            total: 0,
            percentage: 0,
            students: [] 
          };
        }
      });
      
      const classResults = await Promise.all(classPromises);
      setSelectedDateDetails({ date, classes: classResults });
    } catch (error) {
      console.error('Error fetching date details:', error);
      setSelectedDateDetails(null);
    } finally {
      setLoadingDateDetails(false);
    }
  };

  const handleCloseDateDialog = () => {
    setSelectedDateDetails(null);
    setSelectedClassForDate(null);
  };

  const handleClassClickForDate = (classId: string) => {
    setSelectedClassForDate(classId);
  };

  const handleBackToClasses = () => {
    setSelectedClassForDate(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircleIcon color="success" />;
      case 'absent': return <CancelIcon color="error" />;
      case 'late': return <AccessTimeIcon color="warning" />;
      case 'leave': return <EventBusyIcon color="info" />;
      default: return <PersonIcon />;
    }
  };

  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'late': return 'warning';
      case 'leave': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 6 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button component={Link} to="/" variant="outlined" size="small" startIcon={<ArrowBackIcon />}>
              Back
            </Button>
            <div>
              <Typography variant="h4" fontWeight="bold">Attendance Reports</Typography>
              <Typography color="text.secondary">View detailed attendance analytics for all classes</Typography>
            </div>
          </div>
          <Button variant="contained" color="primary" startIcon={<DownloadIcon />}>
            Export Report
          </Button>
        </Toolbar>
      </AppBar>

      <div style={{ maxWidth: 'var(--mui-max-width-lg, 1200px)', margin: '0 auto' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Daily Report" />
            <Tab label="Weekly Report" />
            <Tab label="Monthly Report" />
          </Tabs>
        </Box>

        {/* Daily Report */}
        {tab === 0 && (
          <>
            {/* Date Selector */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Select Date</Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => {
                    if (newValue && isWeekday(newValue.toDate())) {
                      setSelectedDate(newValue);
                    }
                  }}
                  shouldDisableDate={(date) => {
                    // Disable weekends (Saturday = 6, Sunday = 0)
                    const dayOfWeek = date.day();
                    return dayOfWeek === 0 || dayOfWeek === 6;
                  }}
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      size: "small",
                      sx: { minWidth: 200 },
                      helperText: "Only weekdays (Monday to Friday) are available"
                    }
                  }}
                />
              </LocalizationProvider>
            </div>

            {/* Overall Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Overall Attendance</Typography>
                    <TrendingUpIcon color="success" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingDaily ? '--' : `${dailyStats.percent}%`}</Typography>
                  <Typography variant="body2" color="success.main">{loadingDaily ? '' : `Present: ${dailyStats.present}, Late: ${dailyStats.late}`}</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Total Present</Typography>
                    <CalendarMonthIcon color="primary" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingDaily ? '--' : dailyStats.present + dailyStats.late}</Typography>
                  <Typography variant="body2" color="text.secondary">out of {loadingDaily ? '--' : dailyStats.total} students</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Total Absent</Typography>
                    <TrendingDownIcon color="error" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingDaily ? '--' : dailyStats.absent}</Typography>
                  <Typography variant="body2" color="error.main">{loadingDaily ? '' : `${dailyStats.total ? ((dailyStats.absent / dailyStats.total) * 100).toFixed(1) : 0}% of total`}</Typography>
                </div>
              </div>
            </div>

            {/* Class-wise Attendance */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Class-wise Attendance</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Click on a class to view individual student attendance</Typography>
                <Divider sx={{ mb: 2 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {classAttendance.map((classData) => (
                    <Card 
                      key={classData.classId} 
                      sx={{ 
                        flex: '1 1 300px', 
                        minWidth: 0, 
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleClassClick(classData.classId)}
                    >
                      <CardContent>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Typography variant="h6" fontWeight="bold">{classData.classId}</Typography>
                          <Typography variant="h5" color="primary" fontWeight="bold">{classData.percentage}%</Typography>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                          <Chip label={`Late: ${classData.late}`} color="warning" size="small" />
                          <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                          {classData.leave > 0 && <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />}
                        </div>
                        <Typography variant="body2" color="text.secondary">
                          Total: {classData.total} students
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Weekly Report */}
        {tab === 1 && (
          <>
            {/* Week Navigation */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Typography variant="h6" fontWeight="bold">Select Week</Typography>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <IconButton onClick={() => navigateWeek('prev')}>
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="body1" fontWeight="medium">
                    {getWeekRange()}
                  </Typography>
                  <IconButton onClick={() => navigateWeek('next')}>
                    <ChevronRightIcon />
                  </IconButton>
                </div>
              </div>
            </div>

            {/* Overall Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Overall Attendance</Typography>
                    <TrendingUpIcon color="success" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingWeekly ? '--' : `${weeklyStats.percent}%`}</Typography>
                  <Typography variant="body2" color="success.main">{loadingWeekly ? '' : `Present: ${weeklyStats.present}, Late: ${weeklyStats.late}`}</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Total Present</Typography>
                    <CalendarMonthIcon color="primary" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingWeekly ? '--' : weeklyStats.present + weeklyStats.late}</Typography>
                  <Typography variant="body2" color="text.secondary">out of {loadingWeekly ? '--' : weeklyStats.total} students</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Total Absent</Typography>
                    <TrendingDownIcon color="error" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingWeekly ? '--' : weeklyStats.absent}</Typography>
                  <Typography variant="body2" color="error.main">{loadingWeekly ? '' : `${weeklyStats.total ? ((weeklyStats.absent / weeklyStats.total) * 100).toFixed(1) : 0}% of total`}</Typography>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Daily Attendance Breakdown</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Click on a day to view class-wise attendance</Typography>
              <Divider sx={{ mb: 2 }} />
              {loadingWeekly ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Typography variant="body1" color="text.secondary">
                    Loading weekly data...
                  </Typography>
                </div>
              ) : (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell align="center">Present</TableCell>
                        <TableCell align="center">Absent</TableCell>
                        <TableCell align="center">Late</TableCell>
                        <TableCell align="center">Leave</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Attendance %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weeklyData.map((day, index) => (
                        <TableRow 
                          key={index}
                          hover
                          onClick={() => handleDayClick(day)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium">
                              {day.day}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{day.present}</TableCell>
                          <TableCell align="center">{day.absent}</TableCell>
                          <TableCell align="center">{day.late}</TableCell>
                          <TableCell align="center">{day.leave}</TableCell>
                          <TableCell align="center">{day.total}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${day.total ? Math.round(((day.present + day.late) / day.total) * 100) : 0}%`}
                              color={day.total ? (Math.round(((day.present + day.late) / day.total) * 100) >= 90 ? 'success' : Math.round(((day.present + day.late) / day.total) * 100) >= 80 ? 'warning' : 'error') : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>

            {/* Weekly Chart */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Weekly Attendance Trend</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Daily attendance pattern for the selected week across all classes</Typography>
                <Divider sx={{ mb: 2 }} />
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#4caf50" name="Present" />
                      <Bar dataKey="absent" fill="#f44336" name="Absent" />
                      <Bar dataKey="late" fill="#ff9800" name="Late" />
                      <Bar dataKey="leave" fill="#2196f3" name="On Leave" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Monthly Report */}
        {tab === 2 && (
          <>
            {/* Year Selector */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Typography variant="h6" fontWeight="bold">Select Academic Year</Typography>
                <TextField
                  type="number"
                  label="Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 120 }}
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Monthly Attendance Overview - {selectedYear}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Click on a month to view detailed daily attendance</Typography>
              <Divider sx={{ mb: 2 }} />
              {loadingMonthly ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Typography variant="body1" color="text.secondary">
                    Loading monthly data... This may take a few moments.
                  </Typography>
                </div>
              ) : monthlySummaries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Typography variant="body1" color="text.secondary">
                    No attendance records found for {selectedYear}. Try selecting a different year.
                  </Typography>
                </div>
              ) : (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="center">Total Days</TableCell>
                        <TableCell align="center">Present Days</TableCell>
                        <TableCell align="center">Total Students</TableCell>
                        <TableCell align="center">Attendance %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlySummaries.map((summary) => (
                        <TableRow 
                          key={`${summary.year}-${summary.month}`}
                          hover
                          onClick={() => handleMonthClick(summary)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium">
                              {summary.monthName} {summary.year}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{summary.totalDays}</TableCell>
                          <TableCell align="center">{summary.presentDays}</TableCell>
                          <TableCell align="center">{summary.totalStudents}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${summary.percentage}%`}
                              color={summary.percentage >= 90 ? 'success' : summary.percentage >= 80 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </>
        )}
      </div>

      {/* Student Details Dialog */}
      <Dialog open={Boolean(selectedClass)} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedClass} - Student Attendance ({selectedDate.format('YYYY-MM-DD')})
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Typography>Loading students...</Typography>
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

      {/* Month Details Dialog */}
      <Dialog open={Boolean(selectedMonthDetails)} onClose={handleCloseMonthDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedMonthDetails?.monthName} {selectedMonthDetails?.year} - Daily Attendance Details
            </Typography>
            <IconButton onClick={handleCloseMonthDialog}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 16 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Attendance: {selectedMonthDetails?.percentage}% | 
              Total Days: {selectedMonthDetails?.totalDays} | 
              Present Days: {selectedMonthDetails?.presentDays}
            </Typography>
          </div>
          {loadingMonthDetails ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Typography variant="body1" color="text.secondary">
                Loading daily details...
              </Typography>
            </div>
          ) : (
            <div>
              {monthDetailsData.map((day) => (
                <div key={day.date} style={{ marginBottom: 16, border: '1px solid #e0e0e0', borderRadius: 8 }}>
                  {/* Day Summary Row - Clickable */}
                  <div 
                    style={{ 
                      background: '#f5f5f5', 
                      padding: 16, 
                      borderBottom: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onClick={() => handleDateClick(day.date)}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      {day.date}
                    </Typography>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Chip label={`Present: ${day.present}`} color="success" size="small" />
                      <Chip label={`Late: ${day.late}`} color="warning" size="small" />
                      <Chip label={`Absent: ${day.absent}`} color="error" size="small" />
                      {day.leave > 0 && <Chip label={`Leave: ${day.leave}`} color="info" size="small" />}
                      <Chip 
                        label={`${day.percentage}%`}
                        color={day.percentage >= 90 ? 'success' : day.percentage >= 80 ? 'warning' : 'error'}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Click to view class details
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMonthDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Date Details Dialog */}
      <Dialog open={Boolean(selectedDateDetails)} onClose={handleCloseDateDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedDateDetails?.date} - {selectedClassForDate ? `${selectedClassForDate} Students` : 'Class Overview'}
            </Typography>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedClassForDate && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleBackToClasses}
                  startIcon={<ArrowBackIcon />}
                >
                  Back to Classes
                </Button>
              )}
              <IconButton onClick={handleCloseDateDialog}>
                <CloseIcon />
              </IconButton>
            </div>
          </div>
        </DialogTitle>
        <DialogContent>
          {loadingDateDetails ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Typography variant="body1" color="text.secondary">
                Loading details...
              </Typography>
            </div>
          ) : selectedClassForDate ? (
            // Show students for selected class
            <div>
              {(() => {
                const classData = selectedDateDetails?.classes.find(c => c.classId === selectedClassForDate);
                if (!classData) return null;
                
                return (
                  <div>
                    <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {selectedClassForDate} - Summary
                      </Typography>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                        <Chip label={`Late: ${classData.late}`} color="warning" size="small" />
                        <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                        {classData.leave > 0 && <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />}
                        <Chip 
                          label={`${classData.percentage}%`}
                          color={classData.percentage >= 90 ? 'success' : classData.percentage >= 80 ? 'warning' : 'error'}
                          size="small"
                        />
                      </div>
                    </div>
                    
                    {classData.students.length > 0 ? (
                      <List>
                        {classData.students.map((student) => (
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
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                        No students found for this class on the selected date.
                      </Typography>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            // Show class overview
            <div>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Click on a class to view individual student details
              </Typography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {selectedDateDetails?.classes.map((classData) => (
                  <Card 
                    key={classData.classId} 
                    sx={{ 
                      flex: '1 1 300px', 
                      minWidth: 0, 
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleClassClickForDate(classData.classId)}
                  >
                    <CardContent>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Typography variant="h6" fontWeight="bold">{classData.classId}</Typography>
                        <Chip 
                          label={`${classData.percentage}%`}
                          color={classData.percentage >= 90 ? 'success' : classData.percentage >= 80 ? 'warning' : 'error'}
                          size="small"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                        <Chip label={`Late: ${classData.late}`} color="warning" size="small" />
                        <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                        {classData.leave > 0 && <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />}
                      </div>
                      <Typography variant="body2" color="text.secondary">
                        Total: {classData.total} students
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDateDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Day Classes Dialog */}
      <Dialog open={Boolean(selectedDay)} onClose={handleCloseDayDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedDay} - Class Overview
            </Typography>
            <IconButton onClick={handleCloseDayDialog}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          {loadingDayClasses ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Typography variant="body1" color="text.secondary">
                Loading class data...
              </Typography>
            </div>
          ) : (
            <div>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Click on a class to view individual student details for {selectedDay}
              </Typography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {dayClasses.map((classData) => (
                  <Card 
                    key={classData.classId} 
                    sx={{ 
                      flex: '1 1 300px', 
                      minWidth: 0, 
                      cursor: classData.total > 0 ? 'pointer' : 'default',
                      opacity: classData.total > 0 ? 1 : 0.6,
                      '&:hover': classData.total > 0 ? {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                      } : {},
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      if (classData.total > 0) {
                        // Find the corresponding date for this day
                        const dayIndex = weeklyData.findIndex(d => d.day === selectedDay);
                        if (dayIndex !== -1) {
                          const weekDates = getWeekDates(selectedWeek);
                          const date = weekDates[dayIndex];
                          const yyyymmdd = formatDate(date);
                          handleClassClickForSpecificDay(classData.classId, yyyymmdd);
                        }
                      }
                    }}
                  >
                    <CardContent>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Typography variant="h6" fontWeight="bold">{classData.classId}</Typography>
                        <Chip 
                          label={`${classData.percentage}%`}
                          color={classData.percentage >= 90 ? 'success' : classData.percentage >= 80 ? 'warning' : 'error'}
                          size="small"
                        />
                      </div>
                      {classData.total > 0 ? (
                        <>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                            <Chip label={`Late: ${classData.late}`} color="warning" size="small" />
                            <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                            {classData.leave > 0 && <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />}
                          </div>
                          <Typography variant="body2" color="text.secondary">
                            Total: {classData.total} students
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No attendance records for this class on {selectedDay}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDayDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}