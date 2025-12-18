import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaStar } from "react-icons/fa";
import Loading from "../Layouts/Loading";
import axios from "../../config/api/axios";

const MyFeedback = () => {
  const { user } = useContext(UserContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyFeedbacks = async () => {
      try {
        if (!user?._id) {
          setError("User ID not found");
          return;
        }
        const response = await axios.get(`/feedback/student/${user._id}`);
        setFeedbacks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            "Failed to fetch your feedback";
        setError(errorMessage);
        console.error("Error fetching student feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "student" && user._id) {
      fetchMyFeedbacks();
    } else if (user && user.role === "student") {
      setError("User ID missing");
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

  if (loading) return <Loading />;

  if (user.role !== "student") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only students can access this page.</p>
      </div>
    );
  }

  return (
    <main className="my-feedback">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        My Feedback
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Your Submitted Feedback ({feedbacks.length})</h3>
        </div>
        
        {feedbacks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">You haven't submitted any feedback yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback, index) => (
              <div key={feedback._id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                      {feedback.subject}
                    </h4>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
                      {feedback.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 mb-1">
                      {renderStars(feedback.rating)}
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({feedback.rating}/5)</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(feedback.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  {feedback.feedback}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyFeedback;