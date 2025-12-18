import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaStar } from "react-icons/fa";
import Loading from "../Layouts/Loading";
import axios from "../../config/api/axios";

const StaffFeedback = () => {
  const { user } = useContext(UserContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        let response;
        if (user.role === "admin") {
          // Admin can see all staff feedbacks from all departments
          response = await axios.get('/feedback/staff/all');
        } else if (user.role === "HOD" && user.department) {
          // HOD can see staff feedbacks from their department only
          response = await axios.get(`/feedback/staff/department/${encodeURIComponent(user.department)}`);
        } else {
          setError("Department information not found");
          return;
        }
        setFeedbacks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            "Failed to fetch staff feedback data";
        setError(errorMessage);
        console.error("Error fetching staff feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && (user.role === "admin" || (user.role === "HOD" && user.department))) {
      fetchFeedbacks();
    } else if (user && user.role === "HOD") {
      setError("Department information missing");
      setLoading(false);
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        className={`text-sm ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  if (loading) return <Loading />;

  if (user.role !== "HOD" && user.role !== "admin") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD and Admin can access this page.</p>
      </div>
    );
  }

  return (
    <main className="staff-feedback">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Staff Feedback
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        {user.role === "admin" ? "All Departments" : `Department: ${user.department}`}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Staff Feedback ({feedbacks.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff ID</th>
                {user.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Feedback</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {feedbacks.map((feedback, index) => (
                <tr key={feedback._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.staffName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.employeeId || 'N/A'}</td>
                  {user.role === "admin" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200">
                        {feedback.department || 'N/A'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.subject || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      {feedback.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(feedback.priority)}`}>
                      {feedback.priority || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {renderStars(feedback.rating || 0)}
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({feedback.rating || 0}/5)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    <div className="truncate" title={feedback.feedback || ''}>
                      {feedback.feedback && feedback.feedback.length > 50 ? `${feedback.feedback.substring(0, 50)}...` : (feedback.feedback || 'No feedback')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {feedbacks.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No feedback submissions found.</p>
          </div>
        )}


      </div>
    </main>
  );
};

export default StaffFeedback;