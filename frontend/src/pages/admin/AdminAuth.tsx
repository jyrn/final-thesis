import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { HiLockClosed, HiUserGroup, HiShieldCheck, HiExclamationCircle } from 'react-icons/hi2';
import { HiMail, HiEye, HiEyeOff } from 'react-icons/hi';
import adminService from '../../services/adminService';
import './AdminAuth.css';

interface AdminFormData {
  email: string;
  password: string;
}

interface AdminAuthProps {}

const AdminAuth: React.FC<AdminAuthProps> = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AdminFormData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Check if form is valid for button state
  const isFormValid = () => {
    return formData.email.trim() !== '' && 
           formData.password.trim() !== '' &&
           formData.email.includes('@') && 
           formData.email.includes('.')
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Then verify admin privileges with backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api'}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        // Store admin data and token
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        localStorage.setItem('adminToken', idToken);
        
        // Navigate to appropriate dashboard
        if (data.admin.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/pesostaff/dashboard');
        }
      } else {
        setError(data.message || 'Access denied. Admin privileges required.');
      }
    } catch (error: any) {      if (error.code === 'auth/user-not-found') {
        setError('Admin account not found.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Invalid password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <div className="admin-left-panel">
          <div className="admin-visual-content">
            <div className="admin-logo-container">
              <img 
                src="/peso-logo.png" 
                alt="PESO Logo" 
                className="admin-peso-logo"
              />
            </div>
            <div className="admin-journey-text">
              <h2>PESO Admin Portal</h2>
              <p>Secure administrative control for PESO Job Portal</p>
            </div>
            <div className="admin-decorative-circle1"></div>
            <div className="admin-decorative-circle2"></div>
            <div className="admin-decorative-circle3"></div>
          </div>
        </div>

        <div className="admin-right-panel">
          <div className="admin-form-container">
            <div className="admin-role-indicator">
              <div className="admin-role-info">
                <div className="admin-role-icon">
                  <HiShieldCheck />
                </div>
                <div className="admin-role-text">
                  <span className="admin-role-label">Signing in as</span>
                  <span className="admin-role-name">Administrator</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="admin-error-message">
                <HiExclamationCircle className="admin-message-icon" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-header">
                <h1 className="admin-form-title">Welcome Back</h1>
                <p className="admin-form-subtitle">Sign in to your admin account</p>
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label">Email</label>
                <div className="admin-input-wrapper">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="admin-input"
                    placeholder="Enter your admin email"
                    required
                  />
                </div>
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label">Password</label>
                <div className="admin-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="admin-input admin-has-eye-button"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="admin-eye-button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <HiEyeOff /> : <HiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="admin-primary-button"
                disabled={loading || !isFormValid()}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
