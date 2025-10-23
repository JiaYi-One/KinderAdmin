import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import "bootstrap/dist/css/bootstrap.min.css";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('User is already logged in:', user.email);
        navigate('/'); // Redirect to main dashboard
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with email:', email);
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Login successful, user:', user.email);

      // Check if user exists in staff collection using email
      const db = getFirestore();
      const staffQuery = query(collection(db, 'staff'), where('teacherEmail', '==', email));
      const querySnapshot = await getDocs(staffQuery);
      
      if (!querySnapshot.empty) {
        console.log('User found in staff database');
        navigate('/'); // Redirect to main dashboard
      } else {
        console.log('No staff document found for user');
        setError('Account not found in staff database. Please contact administrator.');
        await auth.signOut();
      }
    } catch (err) {
      console.error('Login error:', err);
      const error = err as AuthError;
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = () => {
    setResetEmail(email || '');
    setResetError('');
    setResetSuccess('');
    setShowReset(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!resetEmail) {
      setResetError('Please enter your email');
      return;
    }
    try {
      setResetLoading(true);
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess('Password reset email sent. Please check your inbox.');
    } catch (err) {
      const error = err as AuthError;
      if (error.code === 'auth/user-not-found') {
        setResetError('No account found with this email');
      } else if (error.code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address');
      } else {
        setResetError(error.message || 'Failed to send reset email');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="text-center mb-4">KinderCare</h2>
                <h3 className="text-center mb-4">Login</h3>
                
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={openResetModal}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {showReset && (
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Reset Password</h5>
              <button type="button" className="btn-close" onClick={() => setShowReset(false)}></button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                {resetError && (
                  <div className="alert alert-danger" role="alert">{resetError}</div>
                )}
                {resetSuccess && (
                  <div className="alert alert-success" role="alert">{resetSuccess}</div>
                )}
                <div className="mb-3">
                  <label htmlFor="resetEmail" className="form-label">Email</label>
                  <input
                    id="resetEmail"
                    type="email"
                    className="form-control"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your account email"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReset(false)} disabled={resetLoading}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Login;
