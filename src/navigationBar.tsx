// NavigationBar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./NavigationBar.module.css";
import { FC, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  currentPath: string;
}

const NavLink: FC<NavLinkProps> = ({ to, children, currentPath }) => (
  <Link
    to={to}
    className={`${styles.me3} ${styles.textDecorationNone} ${
      currentPath === to ? styles.active : styles.inactive
    }`}
  >
    {children}
  </Link>
);

const NavigationBar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffName, setStaffName] = useState<string>("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        // Fetch staff name from Firestore
        try {
          const staffQuery = query(
            collection(db, "staff"),
            where("teacherEmail", "==", user.email)
          );
          const staffSnapshot = await getDocs(staffQuery);
          if (!staffSnapshot.empty) {
            const staffData = staffSnapshot.docs[0].data();
            setStaffName(staffData.teacherName || "");
          } else {
            setStaffName("Not found");
          }
        } catch {
          setStaffName("Error");
        }
      } else {
        setIsAuthenticated(false);
        setStaffName("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="d-flex justify-content-between align-items-center p-3 bg-light">
      <h1 className="fw-bold">KinderCare</h1>
      {/* Show current staff name for testing */}
      {isAuthenticated && (
        <span style={{ fontWeight: 500 }}>
          {staffName ? `Staff: ${staffName}` : 'Loading staff name...'}
        </span>
      )}
      <nav className="d-flex align-items-center">
        <NavLink to="/" currentPath={location.pathname}>
          Dashboard
        </NavLink>
        <NavLink to="/newReg/studReg" currentPath={location.pathname}>
          Students
        </NavLink>
        <NavLink to="/bill/createBill" currentPath={location.pathname}>
          Bills
        </NavLink>
        <NavLink to="/classes" currentPath={location.pathname}>
          Classes
        </NavLink>
        <NavLink to="/parent/parentList" currentPath={location.pathname}>
          Parent List
        </NavLink>
        <NavLink to="/teachers/teachersList" currentPath={location.pathname}>
          Teachers
        </NavLink>
        <NavLink to="/chat/chat_list" currentPath={location.pathname}>
          Chat
        </NavLink>
        <NavLink to="/attendance/AttendanceMain" currentPath={location.pathname}>
          Attendance
        </NavLink>
        <div className="ms-3 d-flex align-items-center">
          <button 
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

export default NavigationBar;