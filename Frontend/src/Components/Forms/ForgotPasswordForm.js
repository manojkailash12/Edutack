import React, { useState } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';

const ForgotPasswordForm = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: Email & Credentials, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState(null);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent form
    setLoading(true);
    setError('');
    setMessage('');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    // Validate role-specific fields
    if (role === 'student' && !rollNo.trim()) {
      setError('Roll number is required for student accounts');
      setLoading(false);
      return;
    }
    
    if (role === 'staff' && !username.trim()) {
      setError('Username is required for staff accounts');
      setLoading(false);
      return;
    }
    
    try {
      const requestData = {
        email,
        role,
        ...(role === 'student' ? { rollNo: rollNo.trim() } : { username: username.trim() })
      };
      
      const response = await axios.post('/auth/forgot-password', requestData);
      
      setFoundUser(response.data.userDetails);
      setMessage(response.data.message);
      setStep(2);
      toast.success('OTP sent to your email!');
    } catch (err) {
      console.error('Forgot Password Error:', err);
      let errorMsg = 'Error sending OTP';
      
      if (err.response) {
        // Server responded with error status
        errorMsg = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMsg = 'Network error: Unable to connect to server';
      } else {
        // Something else happened
        errorMsg = err.message || 'Unknown error occurred';
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent form
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/auth/reset-password', { 
        email, 
        role, 
        otp, 
        newPassword 
      });
      setMessage(res.data.message);
      toast.success('Password reset successful! You can now login with your new password.');
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error resetting password';
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {step === 1 ? (
          <form 
            onSubmit={handleSendOTP} 
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Type
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setUsername('');
                  setRollNo('');
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Enter your registered email"
              />
            </div>

            {role === 'student' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="Enter your roll number"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="Enter your username"
                />
              </div>
            )}

            <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <strong>Security Note:</strong> We need both your email and {role === 'student' ? 'roll number' : 'username'} to verify your identity before sending the OTP.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white py-2 px-4 rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying & Sending OTP...' : 'Verify & Send OTP'}
            </button>
          </form>
        ) : (
          <form 
            onSubmit={handleResetPassword} 
            className="space-y-4"
            noValidate
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-700">
                <div className="font-medium text-green-800 dark:text-green-200 mb-2">✓ Account Verified</div>
                <div className="space-y-1 text-xs">
                  <div><strong>Name:</strong> {foundUser?.name}</div>
                  <div><strong>Email:</strong> {foundUser?.email}</div>
                  <div><strong>{role === 'student' ? 'Roll Number' : 'Username'}:</strong> {foundUser?.identifier}</div>
                  <div><strong>Account Type:</strong> {role.charAt(0).toUpperCase() + role.slice(1)}</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                OTP has been sent to <strong>{email}</strong>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Enter 6-digit OTP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-violet-600 text-white py-2 px-4 rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm; 