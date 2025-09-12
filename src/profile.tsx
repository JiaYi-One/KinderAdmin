import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User, LogOut } from 'lucide-react';

interface StaffData {
  teacherName: string;
  teacherEmail: string;
  teacherID: string;
  teacherPhone?: string;
  teacherAddress?: string;
  position?: string;
  department?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user && user.email) {
          const staffQuery = query(
            collection(db, "staff"),
            where("teacherEmail", "==", user.email)
          );
          const staffSnapshot = await getDocs(staffQuery);
          
          if (!staffSnapshot.empty) {
            const staffDoc = staffSnapshot.docs[0];
            setStaffData(staffDoc.data() as StaffData);
          }
        }
      } catch (error) {
        console.error('Error fetching staff data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileClick = () => {
    setShowProfileDetails(true);
  };

  const handleBackToMenu = () => {
    setShowProfileDetails(false);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        Loading...
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center">
      <div className="dropdown" ref={dropdownRef}>
        <button
          className="btn btn-link dropdown-toggle d-flex align-items-center"
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <User size={20} className="me-2" />
          {staffData?.teacherName || 'Username'}
        </button>
        <ul 
          className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`}
          style={{ position: 'absolute', right: 0 }}
        >
          {!showProfileDetails ? (
            <>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={handleProfileClick}
                >
                  <User size={16} className="me-2" />
                  Profile
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center text-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="me-2" />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="dropdown-header d-flex align-items-center">
                <button
                  className="btn btn-link btn-sm p-0 me-2"
                  onClick={handleBackToMenu}
                  style={{ textDecoration: 'none' }}
                >
                  ←
                </button>
                <strong>Profile Details</strong>
              </li>
              <li><hr className="dropdown-divider" /></li>
              
              <li className="px-3 py-2">
                <div className="small text-muted">
                  <div><strong>Name:</strong> {staffData?.teacherName}</div>
                  <div><strong>Email:</strong> {staffData?.teacherEmail}</div>
                  <div><strong>ID:</strong> {staffData?.teacherID}</div>
                  {staffData?.teacherPhone && (
                    <div><strong>Phone:</strong> {staffData.teacherPhone}</div>
                  )}
                  {staffData?.position && (
                    <div><strong>Position:</strong> {staffData.position}</div>
                  )}
                  {staffData?.department && (
                    <div><strong>Department:</strong> {staffData.department}</div>
                  )}
                  {staffData?.teacherAddress && (
                    <div><strong>Address:</strong> {staffData.teacherAddress}</div>
                  )}
                </div>
              </li>
              
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center text-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="me-2" />
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Profile;
