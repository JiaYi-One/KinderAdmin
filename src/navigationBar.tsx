// NavigationBar.tsx
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./NavigationBar.module.css";
import { FC, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Profile from "./profile";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  currentPath: string;
}

interface DropdownItem {
  title: string;
  to: string;
}

interface DropdownMenuProps {
  title: string;
  items: DropdownItem[];
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

const DropdownMenu: FC<DropdownMenuProps> = ({ title, items, currentPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveItem = items.some(item => currentPath === item.to);

  return (
    <div className="dropdown me-3">
      <button
        className={`btn btn-link dropdown-toggle ${styles.textDecorationNone} ${
          hasActiveItem ? styles.active : styles.inactive
        }`}
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {title}
      </button>
      <ul 
        className={`dropdown-menu ${isOpen ? 'show' : ''}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`dropdown-item ${currentPath === item.to ? 'active' : ''}`}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const NavigationBar: FC = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="d-flex justify-content-between align-items-center p-3 bg-light">
      <h1 className="fw-bold">KinderCare</h1>
      <nav className="d-flex align-items-center">
        <NavLink to="/dashboard" currentPath={location.pathname}>
          Dashboard
        </NavLink>
        
        <DropdownMenu
          title="Academic"
          currentPath={location.pathname}
          items={[
            { title: "Registration", to: "/newReg/studReg" },
            { title: "Classes", to: "/newReg/studentList" },
            { title: "Staffs", to: "/teachers/teachersList" },
            { title: "Parents", to: "/parent/parentList" },
            { title: "Attendance", to: "/attendance/AttendanceMain" },
          ]}
        />
        
        <DropdownMenu
          title="Administration"
          currentPath={location.pathname}
          items={[
            { title: "Bills", to: "/bill/bill_Main" },
            { title: "Report", to: "/report/create_report" },
          ]}
        />
        
        <DropdownMenu
          title="Communication"
          currentPath={location.pathname}
          items={[
            { title: "Announcements", to: "/announcements" },
            { title: "Chat", to: "/chat/chat_list" },
          ]}
        />
        
        <div className="ms-3">
          <Profile />
        </div>
      </nav>
    </header>
  );
};

export default NavigationBar;