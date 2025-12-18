import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const HODStaffAttendance = () => {
  const { user } = useContext(UserContext);
  const [staffList, setStaffList] = useState([]);
  const [departmentReport, setDepartmentReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    status: 'present',
    checkInTime: '',
    checkOutTime: '',
    workingHours: 0,
    notes: ''
  });

  const fetchStaffList = useCallback(async () => {
    try {
      const response = await axios.get(`/staff/list/${user.department}`);
      setStaffList(response.data.filter(staff => staff._id !== user._id)); // Exclude HOD from list
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  }, [user]);

  const fetchDepartmentReport = useCallback(async () => {
    try {
      const response = await axios.get(`/staff-attendance/department-report/${user.department}`, {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setDepartmentReport(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching department report:', error);
      setLoading(false);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    if (user?.department) {
      fetchStaffList();
      fetchDepartmentReport();
    }
  }, [user, selectedDate, selectedMonth, selectedYear, fetchStaffList, fetchDepartmentReport]);

  const handleMarkAttendance = async (staffId, status = 'present') => {
    if (status === 'custom') {
      setSelectedStaff(staffId);
      setShowMarkForm(true);
      return;
    }

    setMarkingAttendance(true);
    try {
      const response = await axios.post('/staff-attendance/hod-mark', {
        staffId,
        date: selectedDate,
        status,
        hodId: user._id,
        notes: `Marked by HOD on ${new Date().toLocaleString()}`
      });
      
      toast.success(response.data.message);
      fetchDepartmentReport();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error marking attendance');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleCustomAttendanceSubmit = async (e) => {
    e.preventDefault();
    setMarkingAttendance(true);
    
    try {
      const response = await axios.post('/staff-attendance/hod-mark', {
        staffId: selectedStaff,
        date: selectedDate,
        status: attendanceForm.status,
        hodId: user._id,
        checkInTime: attendanceForm.checkInTime ? new Date(`${selectedDate}T${attendanceForm.checkInTime}`) : null,
        checkOutTime: attendanceForm.checkOutTime ? new Date(`${selectedDate}T${attendanceForm.checkOutTime}`) : null,
        workingHours: parseFloat(attendanceForm.workingHours) || 0,
        notes: attendanceForm.notes
      });
      
      toast.success(response.data.message);
      setShowMarkForm(false);
      setSelectedStaff(null);
      setAttendanceForm({
        status: 'present',
        checkInTime: '',
        checkOutTime: '',
        workingHours: 0,
        notes: ''
      });
      fetchDepartmentReport();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error marking attendance');
    } finally {
      setMarkingAttendance(false);
    }
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTodayAttendanceForStaff = (staffId) => {
    if (!departmentReport?.staffAttendance) return null;
    
    const staffData = departmentReport.staffAttendance.find(s => s.staffInfo._id === staffId);
    if (!staffData) return null;
    
    return staffData.attendance.find(a => a.date === selectedDate);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Staff Attendance Management</h1>
      
      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
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

      {/* Department Statistics */}
      {departmentReport?.departmentStats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Department Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{departmentReport.departmentStats.totalStaff}</p>
              <p className="text-sm text-gray-600">Total Staff</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{departmentReport.departmentStats.presentRecords}</p>
              <p className="text-sm text-gray-600">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{departmentReport.departmentStats.absentRecords}</p>
              <p className="text-sm text-gray-600">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{departmentReport.departmentStats.lateRecords}</p>
              <p className="text-sm text-gray-600">Late</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{departmentReport.departmentStats.leaveRecords}</p>
              <p className="text-sm text-gray-600">On Leave</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{departmentReport.departmentStats.averageAttendance}%</p>
              <p className="text-sm text-gray-600">Avg Attendance</p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Attendance for Selected Date */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Staff Attendance for {selectedDate}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Staff Name</th>
                <th className="px-4 py-2 text-left">Employee ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Check In</th>
                <th className="px-4 py-2 text-left">Check Out</th>
                <th className="px-4 py-2 text-left">Working Hours</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => {
                const todayAttendance = getTodayAttendanceForStaff(staff._id);
                return (
                  <tr key={staff._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{staff.name}</td>
                    <td className="px-4 py-2">{staff.employeeId}</td>
                    <td className="px-4 py-2">
                      {todayAttendance ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(todayAttendance.status)}`}>
                          {todayAttendance.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                          Not Marked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{formatTime(todayAttendance?.checkInTime)}</td>
                    <td className="px-4 py-2">{formatTime(todayAttendance?.checkOutTime)}</td>
                    <td className="px-4 py-2">{todayAttendance?.workingHours || 0} hrs</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleMarkAttendance(staff._id, 'present')}
                          disabled={markingAttendance}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(staff._id, 'absent')}
                          disabled={markingAttendance}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(staff._id, 'late')}
                          disabled={markingAttendance}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(staff._id, 'custom')}
                          disabled={markingAttendance}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Custom
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {staffList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No staff found in your department.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Staff Attendance Summary */}
      {departmentReport?.staffAttendance && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Attendance Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Staff Name</th>
                  <th className="px-4 py-2 text-left">Total Days</th>
                  <th className="px-4 py-2 text-left">Present</th>
                  <th className="px-4 py-2 text-left">Absent</th>
                  <th className="px-4 py-2 text-left">Late</th>
                  <th className="px-4 py-2 text-left">Leave</th>
                  <th className="px-4 py-2 text-left">Attendance %</th>
                  <th className="px-4 py-2 text-left">Working Hours</th>
                </tr>
              </thead>
              <tbody>
                {departmentReport.staffAttendance.map((staffData) => (
                  <tr key={staffData.staffInfo._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{staffData.staffInfo.name}</td>
                    <td className="px-4 py-2">{staffData.statistics.totalDays}</td>
                    <td className="px-4 py-2 text-green-600">{staffData.statistics.presentDays}</td>
                    <td className="px-4 py-2 text-red-600">{staffData.statistics.absentDays}</td>
                    <td className="px-4 py-2 text-yellow-600">{staffData.statistics.lateDays}</td>
                    <td className="px-4 py-2 text-blue-600">{staffData.statistics.leaveDays}</td>
                    <td className="px-4 py-2">
                      <span className={`font-medium ${staffData.statistics.attendancePercentage >= 80 ? 'text-green-600' : 
                        staffData.statistics.attendancePercentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {staffData.statistics.attendancePercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-2">{staffData.statistics.totalWorkingHours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Attendance Form Modal */}
      {showMarkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Mark Custom Attendance</h3>
            <form onSubmit={handleCustomAttendanceSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={attendanceForm.status}
                    onChange={(e) => setAttendanceForm({...attendanceForm, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half-day">Half Day</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={attendanceForm.checkInTime}
                    onChange={(e) => setAttendanceForm({...attendanceForm, checkInTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={attendanceForm.checkOutTime}
                    onChange={(e) => setAttendanceForm({...attendanceForm, checkOutTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={attendanceForm.workingHours}
                    onChange={(e) => setAttendanceForm({...attendanceForm, workingHours: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={attendanceForm.notes}
                    onChange={(e) => setAttendanceForm({...attendanceForm, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={markingAttendance}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {markingAttendance ? 'Marking...' : 'Mark Attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMarkForm(false);
                    setSelectedStaff(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODStaffAttendance;