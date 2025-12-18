import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import Loading from "../Layouts/Loading";
import axios from "../../config/api/axios";

const MyLeaveRequests = () => {
  const { user } = useContext(UserContext);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyLeaveRequests = async () => {
      try {
        if (!user?._id) {
          setError("User ID not found");
          return;
        }

        let endpoint;
        if (user.role === "student") {
          endpoint = `/leave/student/${user._id}`;
        } else if (user.role === "teacher" || user.role === "HOD") {
          endpoint = `/leave/staff/${user._id}`;
        } else {
          setError("Invalid user role");
          return;
        }

        const response = await axios.get(endpoint);
        setLeaveRequests(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            "Failed to fetch your leave requests";
        setError(errorMessage);
        console.error("Error fetching leave requests:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user._id) {
      fetchMyLeaveRequests();
    } else if (user) {
      setError("User ID missing");
      setLoading(false);
    }
  }, [user]);

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
      case 'Sick Leave':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'Personal':
      case 'Casual Leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'Emergency':
      case 'Emergency Leave':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case 'Conference Leave':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  if (loading) return <Loading />;

  if (!user) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Authentication Required</h2>
        <p className="text-gray-600">Please login to view your leave requests.</p>
      </div>
    );
  }

  return (
    <main className="my-leave-requests">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        My Leave Requests
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Your Leave Requests ({leaveRequests.length})</h3>
        </div>
        
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">You haven't submitted any leave requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((leave, index) => (
              <div key={leave._id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                        {leave.leaveType || 'N/A'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                        {leave.status || 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Duration:</strong> {leave.startDate && leave.endDate ? 
                        `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}` : 
                        'N/A'
                      }
                    </p>
                    {leave.substitute && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Substitute:</strong> {leave.substitute}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted: {leave.submittedAt ? new Date(leave.submittedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    {leave.reviewedAt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Reviewed: {new Date(leave.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Reason:</strong> {leave.reason || 'No reason provided'}
                  </p>
                  {leave.comments && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <strong>Comments:</strong> {leave.comments}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyLeaveRequests;