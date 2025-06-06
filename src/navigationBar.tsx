// NavigationBar.tsx
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./NavigationBar.module.css";
import { FC } from "react";

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

  return (
    <header className="d-flex justify-content-between align-items-center p-3 bg-light">
      <h1 className="fw-bold">KinderCare</h1>
      <nav>
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
        <NavLink to="/chat/chat_list" currentPath={location.pathname}>
          Chat
        </NavLink>
        <NavLink to="/parent/parentList" currentPath={location.pathname}>
          Parent List
        </NavLink>
        <NavLink to="/teachers/teachersList" currentPath={location.pathname}>
          Teachers
        </NavLink>
      </nav>
    </header>
  );
};

export default NavigationBar;