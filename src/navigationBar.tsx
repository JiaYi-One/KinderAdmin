// NavigationBar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./NavigationBar.module.css";
import { FC, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

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

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
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