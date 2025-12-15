import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaStar } from "react-icons/fa";
import Loading from "../Layouts/Loading";

const StaffFeedback = () => {
  const { user } = useContext(UserContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mock feedback data since there's no backend endpoint yet
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for demonstration
        const mockFeedbacks = [
          {
            _id: "1",
            staffName: "Dr. Sarah Wilson",
            staffId: "ST001",
            subject: "Infrastructure",
            rating: 4,
            feedback: "Need better projector facilities in classroom 101. Current equipment is outdated.",
            submittedAt: new Date().toISOString(),
            category: "Infrastructure",
            priority: "Medium"
          },
          {
            _id: "2",
            staffName: "Prof. Robert Brown",
            staffId: "ST002",
            subject: "Academic Resources",
            rating: 3,
            feedback: "Library needs more recent computer science books and research journals.",
            submittedAt: new Date().toISOString(),
            category: "Resources",
            priority: "High"
          },
          {
            _id: "3",
            staffName: "Dr. Emily Davis",
            staffId: "ST003",
            subject: "Administrative Process",
            rating: 5,
            feedback: "The new online grading system is working very well. Great improvement!",
            submittedAt: new Date().toISOString(),
            category: "Administration",
            priority: "Low"
          }
        ];
        
        setFeedbacks(mockFeedbacks);
      } catch (err) {
        setError("Failed to fetch feedback data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "HOD" && user.department) {
      fetchFeedbacks();
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

  if (user.role !== "HOD") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD can access this page.</p>
      </div>
    );
  }

  return (
    <main className="staff-feedback">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Staff Feedback
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
          <h3 className="text-lg font-semibold">Staff Feedback ({feedbacks.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff ID</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.staffName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.staffId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      {feedback.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(feedback.priority)}`}>
                      {feedback.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {renderStars(feedback.rating)}
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({feedback.rating}/5)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    <div className="truncate" title={feedback.feedback}>
                      {feedback.feedback.length > 50 ? `${feedback.feedback.substring(0, 50)}...` : feedback.feedback}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(feedback.submittedAt).toLocaleDateString()}
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

        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-orange-800 dark:text-orange-200 text-sm">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            This is a demo with sample data. The staff feedback system will be fully integrated with the backend in the next update.
          </p>
        </div>
      </div>
    </main>
  );
};

export default StaffFeedback;