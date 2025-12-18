import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import InstantLoader from '../Layouts/InstantLoader';

const AdminDashboard = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalDepartments: 0,
    totalPapers: 0,
    recentActivities: [],
    pendingApprovals: {
      staff: 0,
      leaves: 0,
      feedbacks: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data with individual error handling
      let students = [];
      let staff = [];
      let papers = [];

      try {
        const studentsRes = await axios.get('/student/all', { timeout: 10000 });
        students = studentsRes.data || [];
      } catch (error) {
        console.warn('Failed to fetch students:', error.message);
      }

      try {
        const staffRes = await axios.get('/staff', { timeout: 10000 });
        staff = staffRes.data || [];
      } catch (error) {
        console.warn('Failed to fetch staff:', error.message);
      }

      try {
        const papersRes = await axios.get('/paper/all', { timeout: 10000 });
        papers = papersRes.data || [];
      } catch (error) {
        console.warn('Failed to fetch papers:', error.message);
      }

      const departments = [...new Set(staff.map(s => s.department))];
      const pendingStaff = staff.filter(s => !s.approved).length;

      setDashboardData({
        totalStudents: students.length,
        totalStaff: staff.length,
        totalDepartments: departments.length,
        totalPapers: papers.length,
        recentActivities: [
          { type: 'info', message: `${students.length} students registered`, time: 'Today' },
          { type: 'warning', message: `${pendingStaff} staff approvals pending`, time: 'Today' },
          { type: 'success', message: `${papers.length} papers configured`, time: 'Today' }
        ],
        pendingApprovals: {
          staff: pendingStaff,
          leaves: 0, // Will be updated with actual data
          feedbacks: 0 // Will be updated with actual data
        }
      });
      setLoading(false);
      setServerError(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setServerError(true);
      setLoading(false);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Server connection timeout. Please check if the backend server is running on port 3500.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check if the backend server is running.');
      } else {
        toast.error('Failed to load dashboard data. Please check server connection.');
      }
    }
  };

  if (loading && dashboardData.totalStudents === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
        <InstantLoader type="dashboard" />
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        {serverError && (
          <div className="flex items-center bg-red-100 text-red-700 px-4 py-2 rounded-lg">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Server Disconnected
            <button 
              onClick={fetchDashboardData}
              className="ml-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalStaff}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalDepartments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Papers</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalPapers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'staff-management', name: 'Staff Management' },
              { id: 'student-management', name: 'Student Management' },
              { id: 'certificate-management', name: 'Certificate Management' },
              { id: 'attendance-reports', name: 'Attendance Reports' },
              { id: 'feedback-reports', name: 'Feedback Reports' },
              { id: 'salary-management', name: 'Salary Management' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span>Staff Registrations</span>
                    <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-sm">
                      {dashboardData.pendingApprovals.staff}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Leave Requests</span>
                    <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {dashboardData.pendingApprovals.leaves}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Feedback Reviews</span>
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm">
                      {dashboardData.pendingApprovals.feedbacks}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
                <div className="space-y-3">
                  {dashboardData.recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff-management' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Staff Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <button 
                  onClick={() => navigate('/dash/all_staff_management')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-blue-900">View All Staff</h4>
                  <p className="text-sm text-blue-700">Manage staff records and details</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/manage_staff_attendance')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-green-900">Staff Attendance</h4>
                  <p className="text-sm text-green-700">Monitor staff attendance across all departments</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/admin_attendance')}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-orange-900">My Attendance</h4>
                  <p className="text-sm text-orange-700">Mark and track your own attendance</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/salary_management')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-purple-900">Salary Management</h4>
                  <p className="text-sm text-purple-700">Manage staff salaries and payroll</p>
                </button>
              </div>
              
              <h4 className="text-md font-semibold mb-3 text-gray-700">Leave Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/dash/staff_leave')}
                  className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-red-900">Staff Leave Requests</h4>
                  <p className="text-sm text-red-700">Approve/reject staff leave applications</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/student_leave')}
                  className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-yellow-900">Student Leave Overview</h4>
                  <p className="text-sm text-yellow-700">View all student leave requests (HOD approves)</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'student-management' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Student Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => navigate('/dash/manage_students')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-blue-900">View All Students</h4>
                  <p className="text-sm text-blue-700">Manage student records across all departments</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/view_attendance')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-green-900">Student Attendance</h4>
                  <p className="text-sm text-green-700">Monitor student attendance reports</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/internal')}
                  className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-yellow-900">Academic Performance</h4>
                  <p className="text-sm text-yellow-700">View marks and academic progress</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'certificate-management' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Certificate Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => navigate('/dash/admin_certificate_manager')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-purple-900">Manage Internal Marks</h4>
                  <p className="text-sm text-purple-700">View and manage all internal marks submitted by staff</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/admin_certificate_manager')}
                  className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-indigo-900">Add External Marks</h4>
                  <p className="text-sm text-indigo-700">Add external marks (+40) for students</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/admin_certificate_manager')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-green-900">Generate Certificates</h4>
                  <p className="text-sm text-green-700">Generate and email certificates to students</p>
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Certificate System Overview</h4>
                <p className="text-sm text-blue-700">
                  As an admin, you can view all internal marks, add external marks (0-40), and generate certificates. 
                  Students can then view, download, and email their certificates.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'attendance-reports' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Attendance Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/dash/view_attendance')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-blue-900">Student Attendance Reports</h4>
                  <p className="text-sm text-blue-700">View comprehensive student attendance across all departments</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/manage_staff_attendance')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-green-900">Staff Attendance Reports</h4>
                  <p className="text-sm text-green-700">Monitor staff attendance and performance metrics</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'feedback-reports' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Feedback Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/dash/student_feedback')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-blue-900">Student Feedback</h4>
                  <p className="text-sm text-blue-700">View all student feedback submissions</p>
                </button>
                <button 
                  onClick={() => navigate('/dash/staff_feedback')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200"
                >
                  <h4 className="font-medium text-green-900">Staff Feedback</h4>
                  <p className="text-sm text-green-700">Review staff feedback and suggestions</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'salary-management' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Salary Management</h3>
              <button 
                onClick={() => navigate('/dash/salary_management')}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors duration-200 w-full md:w-auto"
              >
                <h4 className="font-medium text-green-900">Manage Staff Salaries</h4>
                <p className="text-sm text-green-700">Manage staff salaries, generate payslips, and track payments</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;