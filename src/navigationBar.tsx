// NavigationBar.tsx
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./NavigationBar.module.css";

const NavigationBar = () => {
  const location = useLocation();

  return (
    <header className="d-flex justify-content-between align-items-center p-3 bg-light">
      <h1 className="fw-bold">KinderCare</h1>
      <nav>
        <Link
          to="/"
          className={`${styles.me3} ${styles.textDecorationNone} ${
            location.pathname === "/" ? styles.active : styles.inactive // Inactive class
          }`}
        >
          Dashboard
        </Link>
        <Link
          to="/newReg/studReg"
          className={`${styles.me3} ${styles.textDecorationNone} ${
            location.pathname === "/newReg/studReg" ? styles.active : styles.inactive
          }`}
        >
          Students
        </Link>
        <Link
          to="/bill/createBill"
          className={`${styles.me3} ${styles.textDecorationNone} ${
            location.pathname === "/bill/createBill" ? styles.active : styles.inactive
          }`}
        >
          Bills
        </Link>
        <Link
          to="/classes"
          className={`${styles.me3} ${styles.textDecorationNone} ${
            location.pathname === "/classes" ? styles.active : styles.inactive
          }`}
        >
          Classes
        </Link>
        <Link
          to="/chat/chat_list"
          className={`${styles.textDecorationNone} ${
            location.pathname === "/chat/chat_list" ? styles.active : styles.inactive
          }`}
        >
          Chat
        </Link>
      </nav>
    </header>
  );
};

export default NavigationBar;