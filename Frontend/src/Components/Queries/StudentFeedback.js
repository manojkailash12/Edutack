import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaStar } from "react-icons/fa";
import Loading from "../Layouts/Loading";

const StudentFeedback = () => {
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
            studentName: "John Doe",
            rollNo: "CS001",
            section: "A",
            subject: "Data Structures",
            rating: 4,
            feedback: "The course content is very good and well structured. Would like more practical examples.",
            submittedAt: new Date().toISOString(),
            category: "Course Content"
          },
          {
            _id: "2",
            studentName: "Jane Smith",
            rollNo: "CS002",
            section: "B",
            subject: "Database Management",
            rating: 5,
            feedback: "Excellent teaching methodology. Very clear explanations and good interaction.",
            submittedAt: new Date().toISOString(),
            category: "Teaching Quality"
          },
          {
            _id: "3",
            studentName: "Mike Johnson",
            rollNo: "CS003",
            section: "A",
            subject: "Computer Networks",
            rating: 3,
            feedback: "Need more lab sessions for better understanding of practical concepts.",
            submittedAt: new Date().toISOString(),
            category: "Lab Facilities"
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
    <main className="student-feedback">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Student Feedback
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
          <h3 className="text-lg font-semibold">Student Feedback ({feedbacks.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Feedback</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {feedbacks.map((feedback, index) => (
                <tr key={feedback._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.rollNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      {feedback.section}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{feedback.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
                      {feedback.category}
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

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            This is a demo with sample data. The feedback system will be fully integrated with the backend in the next update.
          </p>
        </div>
      </div>
    </main>
  );
};

export default StudentFeedback;