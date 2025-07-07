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

import EventBusyIcon from '@mui/icons-material/EventBusy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { ChipProps } from '@mui/material';
import AttendanceDataService from './attendanceService';

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
    dates.push(new Date(Date.UTC(year, month, i)));
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
  leave: number;
  total: number;
}



interface ClassAttendance {
  classId: string;
  present: number;
  absent: number;
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
    leave: 0,
    total: 0,
    percent: 0,
  });
  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
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
    leave: number; 
    total: number; 
    percentage: number;
    classes: { classId: string; present: number; absent: number; leave: number; total: number; percentage: number }[];
  }[]>([]);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<{ 
    date: string; 
    classes: { 
      classId: string; 
      present: number; 
      absent: number; 
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
      setDailyStats({ present: 0, absent: 0, leave: 0, total: 0, percent: 0 });
      setClassAttendance([]);
      return;
    }
    setLoadingDaily(true);
    const fetchDaily = async () => {
      try {
        const date = selectedDate.format('YYYY-MM-DD');
        const results = await AttendanceDataService.fetchBulkAttendance(classIDs, [date]);
        const totals = results.reduce((acc, curr) => ({
          present: acc.present + curr.present,
          absent: acc.absent + curr.absent,
          leave: acc.leave + curr.leave,
          total: acc.total + curr.total
        }), { present: 0, absent: 0, leave: 0, total: 0 });
        const overallPercent = totals.total ? Math.round((totals.present / totals.total) * 10000) / 100 : 0;
        setDailyStats({ ...totals, percent: overallPercent });
        setClassAttendance(results.map(r => ({
          classId: r.classId,
          present: r.present,
          absent: r.absent,
          leave: r.leave,
          total: r.total,
          percentage: r.percentage
        })));
      } catch (err) {
        console.error('Error fetching daily attendance:', err);
        setDailyStats({ present: 0, absent: 0, leave: 0, total: 0, percent: 0 });
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
    const fetchWeekly = async () => {
      try {
        const weekDates = getWeekDates(selectedWeek);
        const dateStrings = weekDates.map(date => formatDate(date));
        const results = await AttendanceDataService.fetchBulkAttendance(classIDs, dateStrings);
        // Group by date
        const dailyData = dateStrings.map((dateString, index) => {
          const dayResults = results.filter(r => r.date === dateString);
          const dayTotals = dayResults.reduce((acc, curr) => ({
            present: acc.present + curr.present,
            absent: acc.absent + curr.absent,
            leave: acc.leave + curr.leave,
            total: acc.total + curr.total
          }), { present: 0, absent: 0, leave: 0, total: 0 });
          return {
            day: `${weekDates[index].getDate()} ${weekDates[index].toLocaleDateString(undefined, { month: "short" })} - ${weekDates[index].toLocaleDateString(undefined, { weekday: "long" })}`,
            ...dayTotals
          };
        });
        setWeeklyData(dailyData);
      } catch (err) {
        console.error('Error fetching weekly attendance:', err);
        setWeeklyData([]);
      } finally {
        setLoadingWeekly(false);
      }
    };
    fetchWeekly();
  }, [classIDs, selectedWeek]);

  // Fetch Monthly Summaries
  useEffect(() => {
    if (classIDs.length === 0) return;
    setLoadingMonthly(true);
    const fetchMonthlySummaries = async () => {
      try {
        const summaries = [];
        for (let month = 0; month < 12; month++) {
          const year = selectedYear;
          const monthDates = getMonthDates(year, month);
          const weekdays = monthDates.filter(date => {
            const day = date.getDay();
            return day >= 1 && day <= 5; // Monday to Friday
          });
          const dateStrings = weekdays.map(date => formatDate(date));
          if (dateStrings.length === 0) continue;
          const results = await AttendanceDataService.fetchBulkAttendance(classIDs, dateStrings);
          let sumOfDailyPercentages = 0, presentDays = 0, hasRecords = false;
          dateStrings.forEach(dateString => {
            const dayResults = results.filter(r => r.date === dateString);
            const dayTotals = dayResults.reduce((acc, curr) => ({
              present: acc.present + curr.present,
              total: acc.total + curr.total
            }), { present: 0, total: 0 });
            if (dayTotals.total > 0) {
              const dailyPercent = Math.round((dayTotals.present / dayTotals.total) * 10000) / 100;
              sumOfDailyPercentages += dailyPercent;
              presentDays++;
              hasRecords = true;
            }
          });
          if (hasRecords) {
            const percentage = presentDays > 0 ? Math.round((sumOfDailyPercentages / presentDays) * 100) / 100 : 0;
            const totalStudents = results.reduce((acc, curr) => acc + curr.total, 0);
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
      } catch (error) {
        console.error('Error fetching monthly data:', error);
        setMonthlySummaries([]);
      } finally {
        setLoadingMonthly(false);
      }
    };
    fetchMonthlySummaries();
  }, [classIDs, selectedYear]);

  // Fetch Monthly Details
  useEffect(() => {
    if (!selectedMonthDetails || classIDs.length === 0) {
      setMonthDetailsData([]);
      return;
    }
    setLoadingMonthDetails(true);
    const fetchMonthDetails = async () => {
      try {
        const monthDates = getMonthDates(selectedMonthDetails.year, selectedMonthDetails.month);
        const weekdays = monthDates.filter(date => {
          const day = date.getDay();
          return day >= 1 && day <= 5; // Monday to Friday
        });
        const dateStrings = weekdays.map(date => formatDate(date));
        if (dateStrings.length === 0) {
          setMonthDetailsData([]);
          return;
        }
        const results = await AttendanceDataService.fetchBulkAttendance(classIDs, dateStrings);
        const dayResults = dateStrings.map(dateString => {
          const classResults = results.filter(r => r.date === dateString);
          const present = classResults.reduce((acc, curr) => acc + curr.present, 0);
          const absent = classResults.reduce((acc, curr) => acc + curr.absent, 0);
          const leave = classResults.reduce((acc, curr) => acc + curr.leave, 0);
          const total = classResults.reduce((acc, curr) => acc + curr.total, 0);
          const percentage = total ? Math.round((present / total) * 10000) / 100 : 0;
          return {
            date: dateString,
            present,
            absent,
            leave,
            total,
            percentage,
            classes: classResults.map(r => ({
              classId: r.classId,
              present: r.present,
              absent: r.absent,
              leave: r.leave,
              total: r.total,
              percentage: r.percentage
            }))
          };
        });
        setMonthDetailsData(dayResults);
      } catch (error) {
        console.error('Error fetching month details:', error);
        setMonthDetailsData([]);
      } finally {
        setLoadingMonthDetails(false);
      }
    };
    fetchMonthDetails();
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
            const result = await AttendanceDataService.fetchClassAttendance(classId, yyyymmdd);
            result.students.forEach((student: { id: string; name: string; status: string }) => {
              if (!weekStudents[student.id]) {
                weekStudents[student.id] = {
                  id: student.id,
                  name: student.name,
                  status: 'present' // Default status, will be updated based on attendance
                };
              }
              
              // Update status based on attendance (prioritize present > on leave > absent)
              const currentStatus = weekStudents[student.id].status;
              const newStatus = student.status;
              
              if (newStatus === 'present' || 
                  (newStatus === 'on leave' && currentStatus !== 'present') ||
                  (newStatus === 'absent' && currentStatus !== 'present' && currentStatus !== 'on leave')) {
                weekStudents[student.id].status = newStatus;
              }
            });
          } catch (error) {
            console.error(`Error fetching students for ${classId} on ${yyyymmdd}:`, error);
          }
        }
        
        studentsList = Object.values(weekStudents);
      } else {
        // For daily report, fetch students for the selected date
        const result = await AttendanceDataService.fetchClassAttendance(classId, selectedDate.format('YYYY-MM-DD'));
        studentsList = result.students;
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
      
      const results = await AttendanceDataService.fetchBulkAttendance(classIDs, [yyyymmdd]);
      setDayClasses(results.map(r => ({
        classId: r.classId,
        present: r.present,
        absent: r.absent,
        leave: r.leave,
        total: r.total,
        percentage: r.percentage
      })));
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
      const result = await AttendanceDataService.fetchClassAttendance(classId, date);
      setStudents(result.students);
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
      const results = await AttendanceDataService.fetchBulkAttendance(classIDs, [date]);
      setSelectedDateDetails({
        date,
        classes: results.map(r => ({
          classId: r.classId,
          present: r.present,
          absent: r.absent,
          leave: r.leave,
          total: r.total,
          percentage: r.percentage,
          students: r.students
        }))
      });
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
      case 'on leave': return <EventBusyIcon color="info" />;
      default: return <PersonIcon />;
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

  // Calculate overall weekly percentage
  const validDays = weeklyData.filter(day => day.total > 0);
  const overallWeeklyPercent = validDays.length
    ? Math.round((validDays.reduce((sum, day) => sum + ((day.present / day.total) * 100), 0) / validDays.length) * 100) / 100
    : 0;

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
                  
                />
              </LocalizationProvider>
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
                  <Typography variant="h4" fontWeight="bold">{loadingDaily ? '--' : `${dailyStats.percent.toFixed(2)}%`}</Typography>
                  <Typography variant="body2" color="success.main">{loadingDaily ? '' : `Present: ${dailyStats.present}`}</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Total Present</Typography>
                    <CalendarMonthIcon color="primary" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">{loadingDaily ? '--' : dailyStats.present}</Typography>
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
                  <Typography variant="body2" color="error.main">{loadingDaily ? '' : `${dailyStats.total ? ((dailyStats.absent / dailyStats.total) * 100).toFixed(2) : 0}% of total`}</Typography>
                </div>
              </div>
            </div>

            {/* Class-wise Attendance */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div>
                {/* <Typography variant="h6" fontWeight="bold" gutterBottom>Class-wise Attendance</Typography> */}
                {/* <Typography variant="body2" color="text.secondary" gutterBottom>Click on a class to view individual student attendance</Typography>
                <Divider sx={{ mb: 2 }} /> */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {classAttendance.map((classData) => (
                    <Card 
                      key={classData.classId} 
                      sx={{ 
                        width: '100%',
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
                          <Typography variant="h5" color="primary" fontWeight="bold">{classData.percentage.toFixed(2)}%</Typography>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                          <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                          <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                          <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />
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

 

            {/* Daily Breakdown */}
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Daily Attendance Breakdown</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Click on a day to view class-wise attendance</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Overall Weekly Attendance: {overallWeeklyPercent.toFixed(2)}%
              </Typography>
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
                          <TableCell align="center">{day.leave}</TableCell>
                          <TableCell align="center">{day.total}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${day.total ? ((day.present / day.total) * 100).toFixed(2) : '0.00'}%`}
                              color={day.total ? (Math.round((day.present  / day.total) * 100) >= 90 ? 'success' : Math.round((day.present  / day.total) * 100) >= 80 ? 'warning' : 'error') : 'default'}
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
                          
                          <TableCell align="center">
                            <Chip 
                              label={`${summary.percentage.toFixed(2)}%`}
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
                    Overall Attendance: {selectedMonthDetails?.percentage.toFixed(2)}% | 
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
                            {day.date} {/* Optionally, format for display: dayjs(day.date).format('DD MMM YYYY (dddd)') */}
                          </Typography>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Chip label={`Present: ${day.present}`} color="success" size="small" />
                            <Chip label={`Absent: ${day.absent}`} color="error" size="small" />
                            <Chip label={`Leave: ${day.leave}`} color="info" size="small" />
                            <Chip 
                              label={`${day.percentage.toFixed(2)}%`}
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
                    {selectedDateDetails?.date ? dayjs(selectedDateDetails.date).format('DD MMM YYYY (dddd)') : ''} - {selectedClassForDate ? `${selectedClassForDate} Students` : 'Class Overview'}
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
                              <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                              <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />
                              <Chip 
                                label={`${classData.percentage.toFixed(2)}%`}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {(() => {
                        return selectedDateDetails?.classes.map((classData) => (
                          <Card 
                            key={classData.classId} 
                            sx={{ 
                              width: '100%',
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
                                  label={`${classData.percentage.toFixed(2)}%`}
                                  color={classData.percentage >= 90 ? 'success' : classData.percentage >= 80 ? 'warning' : 'error'}
                                  size="small"
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                                <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                                <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />
                              </div>
                              <Typography variant="body2" color="text.secondary">
                                Total: {classData.total} students
                              </Typography>
                            </CardContent>
                          </Card>
                        ));
                      })()}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {dayClasses.map((classData) => (
                        <Card 
                          key={classData.classId} 
                          sx={{ 
                            width: '100%',
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
                                label={`${classData.percentage.toFixed(2)}%`}
                                color={classData.percentage >= 90 ? 'success' : classData.percentage >= 80 ? 'warning' : 'error'}
                                size="small"
                              />
                            </div>
                            {classData.total > 0 ? (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                  <Chip label={`Present: ${classData.present}`} color="success" size="small" />
                                  <Chip label={`Absent: ${classData.absent}`} color="error" size="small" />
                                  <Chip label={`Leave: ${classData.leave}`} color="info" size="small" />
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
    </Box>
  )
}