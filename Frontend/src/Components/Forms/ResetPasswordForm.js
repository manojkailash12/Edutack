import React, { useState } from 'react';
import axios from '../../config/api/axios';

const ResetPasswordForm = ({ userEmail, userRole }) => {
  const [email, setEmail] = useState(userEmail || '');
  const [role, setRole] = useState(userRole || 'student');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/auth/reset-password', { email, role, otp, newPassword });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 border rounded mt-8">
      <h2 className="text-xl mb-4">Reset Password</h2>
      <label className="block mb-2">Email:
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border p-2 mb-2"
          readOnly={!!userEmail}
        />
      </label>
      <label className="block mb-2">Role:
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full border p-2 mb-2"
          disabled={!!userRole}
        >
          <option value="student">Student</option>
          <option value="staff">Staff</option>
        </select>
      </label>
      <label className="block mb-2">OTP:
        <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required className="w-full border p-2 mb-2" />
      </label>
      <label className="block mb-2">New Password:
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full border p-2 mb-2" />
      </label>
      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      {message && <div className="text-green-600 mt-2">{message}</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </form>
  );
};

export default ResetPasswordForm; 