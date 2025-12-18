import { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import { useInstantData } from '../../Hooks/useInstantData';

const AllStaffManagement = () => {
  const { user } = useContext(UserContext);
  const { data: staffData, loading } = useInstantData('staff');
  const [allStaff, setAllStaff] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState({});
  const [staffLeaves, setStaffLeaves] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingStaff, setViewingStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchAllStaffData = useCallback(async () => {
    try {
      // Use cached staff data if available, otherwise fetch
      const staff = staffData || [];
      setAllStaff(staff);

      // Fetch attendance data for each staff member
      const attendancePromises = staff.map(async (staffMember) => {
        try {
          const response = await axios.get(`/staff-attendance/history/${staffMember._id}`, {
            params: { month: selectedMonth, year: selectedYear }
          });
          return { staffId: staffMember._id, data: response.data };
        } catch (error) {
          return { staffId: staffMember._id, data: { attendance: [], statistics: {} } };
        }
      });

      const attendanceResults = await Promise.all(attendancePromises);
      const attendanceMap = {};
      attendanceResults.forEach(result => {
        attendanceMap[result.staffId] = result.data;
      });
      setStaffAttendance(attendanceMap);

      // Fetch leave data for each staff member
      const leavePromises = staff.map(async (staffMember) => {
        try {
          const response = await axios.get(`/leave/staff/${staffMember._id}`);
          return { staffId: staffMember._id, data: response.data };
        } catch (error) {
          return { staffId: staffMember._id, data: [] };
        }
      });

      const leaveResults = await Promise.all(leavePromises);
      const leaveMap = {};
      leaveResults.forEach(result => {
        leaveMap[result.staffId] = result.data;
      });
      setStaffLeaves(leaveMap);

    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast.error('Failed to fetch staff data');
    }
  }, [staffData, selectedMonth, selectedYear]);

  useEffect(() => {
    if (staffData) {
      setAllStaff(staffData);
    }
  }, [staffData]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllStaffData();
    }
  }, [user, selectedDepartment, selectedMonth, selectedYear, fetchAllStaffData]);

  const getDepartments = () => {
    const departments = [...new Set(allStaff.map(staff => staff.department))];
    return departments.filter(dept => dept);
  };

  const getFilteredStaff = () => {
    if (selectedDepartment === 'all') {
      return allStaff;
    }
    return allStaff.filter(staff => staff.department === selectedDepartment);
  };

  const getAttendanceStats = (staffId) => {
    const attendance = staffAttendance[staffId];
    if (!attendance || !attendance.statistics) {
      return { 
        presentDays: 0, 
        totalDays: 0, 
        percentage: 0, 
        totalWorkingHours: 0,
        averageWorkingHours: 0
      };
    }
    return {
      presentDays: attendance.statistics.presentDays || 0,
      totalDays: attendance.statistics.totalDays || 0,
      percentage: attendance.statistics.attendancePercentage || 0,
      totalWorkingHours: attendance.statistics.totalWorkingHours || 0,
      averageWorkingHours: attendance.statistics.averageWorkingHours || 0
    };
  };

  const getLeaveStats = (staffId) => {
    const leaves = staffLeaves[staffId] || [];
    const approvedLeaves = leaves.filter(leave => leave.status === 'Approved').length;
    const pendingLeaves = leaves.filter(leave => leave.status === 'Pending').length;
    return { approved: approvedLeaves, pending: pendingLeaves, total: leaves.length };
  };

  const handleViewStaff = (staff) => {
    setViewingStaff(staff);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff._id);
    setEditForm({
      name: staff.name,
      email: staff.email,
      department: staff.department,
      role: staff.role,
      salary: staff.salary || '',
      employeeId: staff.employeeId,
      phone: staff.phone || '',
      joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveEdit = async (staffId) => {
    try {
      await axios.patch(`/staff/${staffId}`, editForm);
      toast.success('Staff details updated successfully');
      setEditingStaff(null);
      setEditForm({});
      fetchAllStaffData(); // Refresh data
    } catch (error) {
      toast.error('Failed to update staff details');
      console.error('Error updating staff:', error);
    }
  };

  const handleApproveStaff = async (staffId) => {
    try {
      await axios.patch(`/staff/${staffId}`, { approved: true });
      toast.success('Staff approved successfully');
      fetchAllStaffData(); // Refresh data
    } catch (error) {
      toast.error('Failed to approve staff');
      console.error('Error approving staff:', error);
    }
  };

  const closeViewModal = () => {
    setViewingStaff(null);
  };

  const cancelEdit = () => {
    setEditingStaff(null);
    setEditForm({});
  };

  const handleGeneratePayslip = async (staff) => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const response = await axios.post('/payslips/generate', {
        staffId: staff._id,
        month,
        year,
        generatedBy: user._id
      });
      
      toast.success(`Payslip generated successfully for ${staff.name}. ${response.data.payslip.emailSent ? 'Email sent!' : 'Check payslips section.'}`);
      closeViewModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error generating payslip';
      toast.error(errorMessage);
      console.error('Error generating payslip:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading staff data...</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to administrators</p>
        </div>
      </div>
    );
  }

  const filteredStaff = getFilteredStaff();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">All Staff Management</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Departments</option>
              {getDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Staff</h3>
          <p className="text-3xl font-bold text-blue-600">{filteredStaff.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">HODs</h3>
          <p className="text-3xl font-bold text-purple-600">
            {filteredStaff.filter(staff => staff.role === 'HOD').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Teachers</h3>
          <p className="text-3xl font-bold text-green-600">
            {filteredStaff.filter(staff => staff.role === 'teacher').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Departments</h3>
          <p className="text-3xl font-bold text-yellow-600">{getDepartments().length}</p>
        </div>
      </div>

      {/* Staff Details Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Staff Details & Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Employee ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Attendance %</th>
                <th className="px-4 py-2 text-left">Working Hours</th>
                <th className="px-4 py-2 text-left">Leaves</th>
                <th className="px-4 py-2 text-left">Salary</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => {
                const attendanceStats = getAttendanceStats(staff._id);
                const leaveStats = getLeaveStats(staff._id);
                
                return (
                  <tr key={staff._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{staff.employeeId}</td>
                    <td className="px-4 py-2 font-medium">{staff.name}</td>
                    <td className="px-4 py-2">{staff.department}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        staff.role === 'HOD' ? 'bg-purple-100 text-purple-800' :
                        staff.role === 'admin' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {staff.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-medium ${
                        attendanceStats.percentage >= 80 ? 'text-green-600' :
                        attendanceStats.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {attendanceStats.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">
                        <div className="font-medium">{attendanceStats.totalWorkingHours.toFixed(1)} hrs</div>
                        <div className="text-xs text-gray-500">
                          {attendanceStats.presentDays} days • Avg: {attendanceStats.averageWorkingHours.toFixed(1)}h/day
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm" title="Approved/Pending/Total">
                        <span className="text-green-600 font-medium">{leaveStats.approved}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-yellow-600 font-medium">{leaveStats.pending}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600 font-medium">{leaveStats.total}</span>
                        <div className="text-xs text-gray-500 mt-1">A/P/T</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">Rs. {(staff.salary || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        staff.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {staff.approved ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleViewStaff(staff)}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleEditStaff(staff)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                        >
                          Edit
                        </button>
                        {!staff.approved && (
                          <button 
                            onClick={() => handleApproveStaff(staff._id)}
                            className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No staff found for the selected criteria.
            </div>
          )}
        </div>
      </div>

      {/* Department-wise Summary */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Department-wise Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getDepartments().map(dept => {
            const deptStaff = allStaff.filter(staff => staff.department === dept);
            const avgAttendance = deptStaff.reduce((sum, staff) => {
              const stats = getAttendanceStats(staff._id);
              return sum + stats.percentage;
            }, 0) / (deptStaff.length || 1);

            return (
              <div key={dept} className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">{dept}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Staff: {deptStaff.length}</p>
                  <p>HODs: {deptStaff.filter(s => s.role === 'HOD').length}</p>
                  <p>Teachers: {deptStaff.filter(s => s.role === 'teacher').length}</p>
                  <p>Avg Attendance: <span className="font-medium">{Math.round(avgAttendance)}%</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Staff Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Staff Details</h2>
              <button 
                onClick={closeViewModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.employeeId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.department}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="mt-1 text-sm text-gray-900">{viewingStaff.role.toUpperCase()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary Details</label>
                <div className="mt-1 text-sm text-gray-900">
                  <p>Base Salary: Rs. {(viewingStaff.salary || 0).toLocaleString('en-IN')}</p>
                  {viewingStaff.salaryType === 'attendance-based' && (
                    <>
                      <p className="text-xs text-gray-600">Daily Rate: Rs. {(viewingStaff.dailyRate || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-600">Hourly Rate: Rs. {(viewingStaff.hourlyRate || 0).toLocaleString('en-IN')}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-600">Type: {viewingStaff.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joining Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStaff.joiningDate ? new Date(viewingStaff.joiningDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    viewingStaff.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingStaff.approved ? 'Active' : 'Pending Approval'}
                  </span>
                </p>
              </div>
            </div>

            {/* Attendance and Leave Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Attendance Stats</h3>
                {(() => {
                  const stats = getAttendanceStats(viewingStaff._id);
                  return (
                    <div className="space-y-1 text-sm">
                      <p>Working Hours: <span className="font-medium">{stats.totalWorkingHours.toFixed(1)} hrs</span></p>
                      <p>Present Days: {stats.presentDays}/{stats.totalDays}</p>
                      <p>Average: <span className="font-medium">{stats.averageWorkingHours.toFixed(1)} hrs/day</span></p>
                      <p>Attendance: <span className="font-medium">{stats.percentage}%</span></p>
                    </div>
                  );
                })()}
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Leave Stats</h3>
                {(() => {
                  const stats = getLeaveStats(viewingStaff._id);
                  return (
                    <div className="space-y-1 text-sm">
                      <p>Approved: {stats.approved}</p>
                      <p>Pending: {stats.pending}</p>
                      <p>Total: {stats.total}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => handleGeneratePayslip(viewingStaff)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Generate Payslip
              </button>
              <button 
                onClick={() => {
                  closeViewModal();
                  handleEditStaff(viewingStaff);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Edit Details
              </button>
              <button 
                onClick={closeViewModal}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Staff Details</h2>
              <button 
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={editForm.employeeId || ''}
                  onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={editForm.department || ''}
                  onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                  <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                  <option value="Mechanical Engineering (ME)">Mechanical Engineering (ME)</option>
                  <option value="Civil Engineering (CE)">Civil Engineering (CE)</option>
                  <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
                  {getDepartments().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role || ''}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="teacher">Teacher</option>
                  <option value="HOD">HOD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                <input
                  type="number"
                  value={editForm.salary || ''}
                  onChange={(e) => setEditForm({...editForm, salary: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={editForm.joiningDate || ''}
                  onChange={(e) => setEditForm({...editForm, joiningDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveEdit(editingStaff)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllStaffManagement;