import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaCheck, FaTimes, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import axios from "../../config/api/axios";

const StudentLeave = () => {
  const { user } = useContext(UserContext);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        if (user.role === "HOD" && user.department) {
          // Only HOD can see and approve student leave requests from their department
          const response = await axios.get(`/leave/student/department/${encodeURIComponent(user.department)}`);
          setLeaveRequests(Array.isArray(response.data) ? response.data : []);
        } else {
          setError("Department information not found");
          return;
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            "Failed to fetch leave requests";
        setError(errorMessage);
        console.error("Error fetching student leave requests:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "HOD" && user.department) {
      fetchLeaveRequests();
    } else if (user && user.role === "HOD") {
      setError("Department information missing");
      setLoading(false);
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const handleApprove = async (leaveId) => {
    try {
      await axios.patch(`/leave/student/${leaveId}/status`, {
        status: 'Approved',
        reviewerId: user._id
      });
      
      setLeaveRequests(prev => 
        prev.map(leave => 
          leave._id === leaveId ? { ...leave, status: 'Approved' } : leave
        )
      );
      toast.success('Leave request approved successfully');
    } catch (err) {
      console.error('Error approving leave request:', err);
      toast.error(err.response?.data?.message || 'Error approving leave request');
    }
  };

  const handleReject = async (leaveId) => {
    try {
      await axios.patch(`/leave/student/${leaveId}/status`, {
        status: 'Rejected',
        reviewerId: user._id
      });
      
      setLeaveRequests(prev => 
        prev.map(leave => 
          leave._id === leaveId ? { ...leave, status: 'Rejected' } : leave
        )
      );
      toast.success('Leave request rejected');
    } catch (err) {
      console.error('Error rejecting leave request:', err);
      toast.error(err.response?.data?.message || 'Error rejecting leave request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case 'Medical':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'Personal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      case 'Emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  if (loading) return <Loading />;

  if (user.role !== "HOD") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD can access this page. Student leaves must be approved by the respective department HOD.</p>
      </div>
    );
  }

  return (
    <main className="student-leave">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Student Leave
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        Department: {user.department}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Leave Requests ({leaveRequests.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {leaveRequests.map((leave, index) => (
                <tr key={leave._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{leave.studentName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{leave.rollNo || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      {leave.section || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                      {leave.leaveType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {leave.startDate && leave.endDate ? 
                      `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}` : 
                      'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    <div className="truncate" title={leave.reason || ''}>
                      {leave.reason && leave.reason.length > 30 ? `${leave.reason.substring(0, 30)}...` : (leave.reason || 'No reason provided')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      {leave.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave._id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleReject(leave._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaveRequests.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No leave requests found.</p>
          </div>
        )}


      </div>
    </main>
  );
};

export default StudentLeave;