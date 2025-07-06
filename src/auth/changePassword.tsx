import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import "bootstrap/dist/css/bootstrap.min.css";

interface ChangePasswordProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  userId: string;
  userEmail: string;
}

function ChangePassword({ 
  onSuccess, 
  onCancel,
  userId,
  userEmail
}: ChangePasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user is currently signed in');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Update password in Firestore using the provided userId
      const db = getFirestore();
      const parentRef = doc(db, 'parents', userId);

      // Update password in Firestore
      await updateDoc(parentRef, {
        password: newPassword,
        updatedAt: new Date().toISOString()
      });

      // Clear form
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal fade show" 
      style={{ 
        display: 'block',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1050
      }} 
      tabIndex={-1}
    >
      <div 
        className="modal-dialog modal-dialog-centered"
        style={{ zIndex: 1051 }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Password</h5>
            {onCancel && (
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                aria-label="Close"
              ></button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                />
                <div className="form-text">Password must be at least 6 characters long</div>
              </div>

              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="modal-footer">
              {onCancel && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword; 