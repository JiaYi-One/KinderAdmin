"use client"
import {
  Typography, Button, Chip
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Link } from "react-router-dom";

// Mock data
const dashboardStats = {
  totalStudents: 156,
  totalClasses: 8,
  todayAttendance: 142,
  attendanceRate: 91.0,
};

const recentClasses = [
  { id: 1, name: "Sunflower Class", students: 20, present: 18, grade: "KG1" },
  { id: 2, name: "Rainbow Class", students: 22, present: 20, grade: "KG1" },
  { id: 3, name: "Butterfly Class", students: 19, present: 19, grade: "KG2" },
  { id: 4, name: "Star Class", students: 21, present: 17, grade: "KG2" },
];

export default function Dashboard() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ width: "90%", maxWidth: "none", margin: "0 auto", padding: "24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <Typography variant="h3" fontWeight="bold" color="text.primary" style={{ marginBottom: "8px" }}>
            Sunshine Kindergarten
          </Typography>
          <Typography color="text.secondary">Attendance Management System</Typography>
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
              <Typography variant="subtitle2">Today's Attendance</Typography>
              <CalendarMonthIcon color="action" />
            </div>
            <Typography variant="h5" fontWeight="bold">{dashboardStats.todayAttendance}</Typography>
            <Typography variant="caption" color="text.secondary">
              out of {dashboardStats.totalStudents} students
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
              +2.1% from yesterday
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
            <Link to="/reports" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <TrendingUpIcon style={{ color: "#2e7d32" }} />
                <Typography variant="h6">View Reports</Typography>
              </div>
              <Typography variant="body2" color="text.secondary">
                Daily, weekly & monthly reports
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
            <Link to="/students" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <GroupIcon style={{ color: "#9c27b0" }} />
                <Typography variant="h6">Manage Students</Typography>
              </div>
              <Typography variant="body2" color="text.secondary">
                View and manage student profiles
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
            <Typography variant="h6">Today's Class Attendance</Typography>
            <Typography variant="body2" color="text.secondary">Overview of attendance for all classes</Typography>
          </div>
          <div>
            {recentClasses.map((classItem) => (
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
                  <Typography variant="body2" color="text.secondary">
                    Grade: {classItem.grade}
                  </Typography>
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
                    label={`${Math.round((classItem.present / classItem.students) * 100)}%`}
                    color={classItem.present === classItem.students ? "success" : "default"}
                  />
                  <Button
                    component={Link}
                    to={`/attendance/${classItem.id}`}
                    variant="outlined"
                    size="small"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
