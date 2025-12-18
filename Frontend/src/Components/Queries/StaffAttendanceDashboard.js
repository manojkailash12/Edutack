import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import FaceScanAttendance from '../Forms/FaceScanAttendance';
import UserContext from '../../Hooks/UserContext';

const StaffAttendanceDashboard = () => {
  const { user } = useContext(UserContext);
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFaceScan, setShowFaceScan] = useState(false);

  const fetchTodayStatus = useCallback(async () => {
    try {
      console.log('Fetching today status for user:', user._id);
      const response = await axios.get(`/staff-attendance/today/${user._id}`);
      console.log('Today status response:', response.data);
      setTodayStatus(response.data);
    } catch (error) {
      console.error('Error fetching today status:', error);
      toast.error('Failed to fetch today\'s attendance status');
    }
  }, [user._id]);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      console.log('Fetching attendance history for user:', user._id);
      const response = await axios.get(`/staff-attendance/history/${user._id}`, {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      console.log('Attendance history response:', response.data);
      setAttendanceHistory(response.data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to fetch attendance history');
      setAttendanceHistory([]);
    }
  }, [user._id, selectedMonth, selectedYear]);

  const fetchLeaveStats = useCallback(async () => {
    try {
      console.log('Fetching leave stats for user:', user._id);
      const response = await axios.get(`/staff-attendance/leave-stats/${user._id}`, {
        params: { year: selectedYear }
      });
      console.log('Leave stats response:', response.data);
      setLeaveStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leave stats:', error);
      toast.error('Failed to fetch leave statistics');
      setLeaveStats(null);
      setLoading(false);
    }
  }, [user._id, selectedYear]);

  useEffect(() => {
    console.log('StaffAttendanceDashboard - User:', user);
    if (user?._id) {
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchTodayStatus(),
            fetchAttendanceHistory(),
            fetchLeaveStats()
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to load attendance data');
          setLoading(false);
        }
      };
      fetchData();
    } else {
      console.log('No user ID found, setting loading to false');
      setLoading(false);
    }
  }, [user, selectedMonth, selectedYear, fetchTodayStatus, fetchAttendanceHistory, fetchLeaveStats]);

  // Auto-refresh today's status every 30 seconds to keep checkout time updated
  useEffect(() => {
    if (!user?._id) return;

    const interval = setInterval(() => {
      fetchTodayStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?._id, fetchTodayStatus]);

  const handleCheckIn = async (method = 'manual') => {
    setCheckingIn(true);
    try {
      const response = await axios.post('/staff-attendance/checkin', {
        staffId: user._id,
        attendanceMethod: method,
        location: 'Office' // You can make this dynamic
      });
      
      toast.success(response.data.message);
      
      // Immediately refresh all data after check-in
      await Promise.all([
        fetchTodayStatus(),
        fetchAttendanceHistory()
      ]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error checking in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const response = await axios.put('/staff-attendance/checkout', {
        staffId: user._id
      });
      
      toast.success(response.data.message);
      
      // Immediately refresh all data after checkout
      await Promise.all([
        fetchTodayStatus(),
        fetchAttendanceHistory()
      ]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error checking out');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleFaceScan = () => {
    setShowFaceScan(true);
  };

  const handleFaceScanComplete = () => {
    setShowFaceScan(false);
    handleCheckIn('face-scan');
  };

  const handleFaceScanCancel = () => {
    setShowFaceScan(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'on-leave': return 'text-blue-600 bg-blue-100';
      case 'half-day': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString || dateString === 'N/A' || dateString === null || dateString === undefined) {
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'N/A';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading attendance data...</p>
      </div>
    );
  }

  // Check if user exists and is staff
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">No user data found</p>
          <p className="text-gray-600">Please log in again</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'teacher' && user.role !== 'HOD') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to staff members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Staff Attendance Dashboard</h1>
      
      {/* Today's Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-semibold">{formatDate(todayStatus?.today)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Check In</p>
            <p className="font-semibold">{formatTime(todayStatus?.attendance?.checkInTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Check Out</p>
            <p className="font-semibold">{formatTime(todayStatus?.attendance?.checkOutTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Status</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(todayStatus?.attendance?.status)}`}>
              {todayStatus?.attendance?.status || 'Not Marked'}
            </span>
          </div>
        </div>
        
        {/* Check In/Out Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {todayStatus?.canCheckIn && (
            <>
              <button
                onClick={() => handleCheckIn('manual')}
                disabled={checkingIn}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {checkingIn ? 'Checking In...' : 'Check In'}
              </button>
              <button
                onClick={handleFaceScan}
                disabled={checkingIn}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                Face Scan Check In
              </button>
            </>
          )}
          
          {todayStatus?.canCheckOut && (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {checkingOut ? 'Checking Out...' : 'Check Out'}
            </button>
          )}
          
          {todayStatus?.hasCheckedOut && (
            <div className="text-green-600 font-medium">
              ✓ Day Complete
            </div>
          )}
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Attendance Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Attendance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Present Days:</span>
              <span className="font-semibold text-green-600">
                {attendanceHistory.filter(a => ['present', 'late'].includes(a.status)).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Absent Days:</span>
              <span className="font-semibold text-red-600">
                {attendanceHistory.filter(a => a.status === 'absent').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Late Days:</span>
              <span className="font-semibold text-yellow-600">
                {attendanceHistory.filter(a => a.status === 'late').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Leave Days:</span>
              <span className="font-semibold text-blue-600">
                {attendanceHistory.filter(a => a.status === 'on-leave').length}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Yearly Leave Summary</h3>
          {leaveStats && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Leaves:</span>
                <span className="font-semibold">{leaveStats.yearlyTotals.totalLeaves}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved:</span>
                <span className="font-semibold text-green-600">{leaveStats.yearlyTotals.approvedLeaves}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-semibold text-yellow-600">{leaveStats.yearlyTotals.pendingLeaves}</span>
              </div>
              <div className="flex justify-between">
                <span>Rejected:</span>
                <span className="font-semibold text-red-600">{leaveStats.yearlyTotals.rejectedLeaves}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={2024 + i} value={2024 + i}>
                  {2024 + i}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Attendance History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Check In</th>
                <th className="px-4 py-2 text-left">Check Out</th>
                <th className="px-4 py-2 text-left">Working Hours</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Method</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(record.date)}</td>
                  <td className="px-4 py-2">{formatTime(record.checkInTime)}</td>
                  <td className="px-4 py-2">{formatTime(record.checkOutTime)}</td>
                  <td className="px-4 py-2">{record.workingHours || 0} hrs</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-600">
                      {record.attendanceMethod === 'hod-marked' ? 'HOD Marked' : 
                       record.attendanceMethod === 'face-scan' ? 'Face Scan' : 'Manual'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {attendanceHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No attendance records found for the selected period.
            </div>
          )}
        </div>
      </div>

      {/* Face Scan Modal */}
      {showFaceScan && (
        <FaceScanAttendance
          onScanComplete={handleFaceScanComplete}
          onCancel={handleFaceScanCancel}
        />
      )}
    </div>
  );
};

export default StaffAttendanceDashboard;