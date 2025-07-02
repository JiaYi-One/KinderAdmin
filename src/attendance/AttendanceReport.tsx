"use client"

import { useState, useEffect } from "react"
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  Tabs,
  Tab,
  InputLabel,
  FormControl,
  Divider
} from "@mui/material"
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const weeklyData = [
  { day: "Mon", present: 18, absent: 2, late: 0, leave: 1, total: 21 },
  { day: "Tue", present: 19, absent: 1, late: 0, leave: 1, total: 21 },
  { day: "Wed", present: 17, absent: 2, late: 1, leave: 1, total: 21 },
  { day: "Thu", present: 20, absent: 0, late: 0, leave: 1, total: 21 },
  { day: "Fri", present: 18, absent: 1, late: 1, leave: 1, total: 21 },
]

const monthlyData = [
  { week: "Week 1", attendance: 92 },
  { week: "Week 2", attendance: 88 },
  { week: "Week 3", attendance: 95 },
  { week: "Week 4", attendance: 90 },
]

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = useState("all")
  const [tab, setTab] = useState(0)
  const [, setStudents] = useState<{ id: string, name: string }[]>([]);
  const [, setLoadingStudents] = useState(false);
  const [selectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10).replace(/-/g, "");
  });
  const [classIDs, setClassIDs] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

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

  useEffect(() => {
    if (!selectedClass || selectedClass === "all" || !selectedDate) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const fetchStudents = async () => {
      try {
        const studentsCol = collection(db, "attendance", selectedClass, selectedDate);
        const snapshot = await getDocs(studentsCol);
        const studentsList = snapshot.docs.map(doc => ({
          id: doc.data().studentId,
          name: doc.data().name
        }));
        setStudents(studentsList);
      } catch {
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedClass, selectedDate]);

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
              <Typography color="text.secondary">View detailed attendance analytics</Typography>
            </div>
          </div>
          <Button variant="contained" color="primary" startIcon={<DownloadIcon />}>
            Export Report
          </Button>
        </Toolbar>
      </AppBar>

      <div style={{ maxWidth: 'var(--mui-max-width-lg, 1200px)', margin: '0 auto' }}>
        {/* Filters */}
        <div style={{ marginBottom: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
          <div>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Filters</Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: '1 1 300px', minWidth: 0, marginBottom: 16 }}>
                <FormControl fullWidth>
                  <InputLabel>Choose a class</InputLabel>
                  <Select
                    value={selectedClass}
                    label="Choose a class"
                    onChange={e => setSelectedClass(e.target.value)}
                    disabled={loadingClasses}
                  >
                    <MenuItem value="all">All Classes</MenuItem>
                    {classIDs.map(classID => (
                      <MenuItem key={classID} value={classID}>{classID}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              
            </div>
          </div>
        </div>

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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Today's Attendance</Typography>
                    <TrendingUpIcon color="success" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">92%</Typography>
                  <Typography variant="body2" color="success.main">+5% from yesterday</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Present Students</Typography>
                    <CalendarMonthIcon color="primary" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">142</Typography>
                  <Typography variant="body2" color="text.secondary">out of 156 students</Typography>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="subtitle2">Absent Students</Typography>
                    <TrendingDownIcon color="error" />
                  </div>
                  <Typography variant="h4" fontWeight="bold">14</Typography>
                  <Typography variant="body2" color="error.main">8.9% of total</Typography>
                </div>
              </div>
            </div>

            {/*
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Student Attendance Details</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Individual student attendance for today</Typography>
                <Divider sx={{ mb: 2 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {students.map((student) => (
                    <div key={student.id} style={{ flex: '1 1 350px', minWidth: 0, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                        <div>
                          <Typography fontWeight="bold">{student.name}</Typography>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            */}
          </>
        )}

        {/* Weekly Report */}
        {tab === 1 && (
          <div style={{ marginBottom: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
            <div>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Weekly Attendance Trend</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Attendance pattern for this week</Typography>
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
        )}

        {/* Monthly Report */}
        {tab === 2 && (
          <>
            <div style={{ marginBottom: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
              <div>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Monthly Attendance Overview</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Attendance percentage by week</Typography>
                <Divider sx={{ mb: 2 }} />
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[80, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#1976d2"
                        strokeWidth={3}
                        dot={{ fill: "#1976d2", strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: '1 1 350px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <Typography fontWeight="bold" gutterBottom>Monthly Summary</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Average Attendance:</span><span className="font-semibold">91.25%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Best Week:</span><span className="font-semibold" style={{ color: '#4caf50' }}>Week 3 (95%)</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Lowest Week:</span><span className="font-semibold" style={{ color: '#f44336' }}>Week 2 (88%)</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total School Days:</span><span className="font-semibold">20 days</span></div>
                </div>
              </div>
              <div style={{ flex: '1 1 350px', minWidth: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24 }}>
                <div>
                  <Typography fontWeight="bold" gutterBottom>Attendance Goals</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}><span>Target: 95%</span><span>Current: 91.25%</span></div>
                  <div style={{ width: '100%', background: '#e0e0e0', borderRadius: 8, height: 10, marginBottom: 8 }}>
                    <div style={{ background: '#1976d2', height: 10, borderRadius: 8, width: '91.25%' }} />
                  </div>
                  <Typography variant="body2" color="text.secondary">Need 3.75% improvement to reach target</Typography>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Box>
  )
}


