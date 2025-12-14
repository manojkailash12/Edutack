import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import { FaArrowLeft, FaEye } from "react-icons/fa";
import { Link } from "react-router-dom";

const QuizResults = () => {
  const { quizId } = useParams();
  const { user } = useContext(UserContext);
  const [quiz, setQuiz] = useState(null);
  const [userSubmission, setUserSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        setLoading(true);
        
        // Fetch quiz details
        const quizResponse = await axios.get(`/quizzes/quiz/${quizId}`);
        const quizData = quizResponse.data;
        setQuiz(quizData);

        // Find user's submission
        const submission = quizData.submissions?.find(sub => sub.student._id === user._id);
        if (submission) {
          setUserSubmission(submission);
        } else {
          setError("No submission found for this quiz");
        }
      } catch (err) {
        console.error('Error fetching quiz results:', err);
        setError("Error loading quiz results");
        toast.error("Failed to load quiz results");
      } finally {
        setLoading(false);
      }
    };

    if (quizId && user._id) {
      fetchQuizResults();
    }
  }, [quizId, user._id]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          to="/dash/quizzes"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Quizzes
        </Link>
      </div>
    );
  }

  if (!quiz || !userSubmission) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">No Results Found</h2>
        <p className="text-gray-600 mb-4">You haven't submitted this quiz yet.</p>
        <Link
          to="/dash/quizzes"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Quizzes
        </Link>
      </div>
    );
  }

  const percentage = Math.round((userSubmission.score / quiz.totalMarks) * 100);
  const getGradeColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeMessage = (percentage) => {
    if (percentage >= 80) return 'Excellent!';
    if (percentage >= 60) return 'Good Job!';
    if (percentage >= 40) return 'Keep Practicing!';
    return 'Need Improvement';
  };

  return (
    <main className="quiz-results max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dash/quizzes"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft /> Back to Quizzes
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Quiz Results</h1>
      </div>

      {/* Results Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
          <p className="text-gray-600 dark:text-gray-400">Subject: {quiz.paper?.paper}</p>
          {quiz.section && (
            <p className="text-gray-600 dark:text-gray-400">Section: {quiz.section}</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${getGradeColor(percentage)}`}>
              {userSubmission.score}/{quiz.totalMarks}
            </div>
            <div className={`text-3xl font-semibold mb-2 ${getGradeColor(percentage)}`}>
              {percentage}%
            </div>
            <p className={`text-lg font-medium ${getGradeColor(percentage)}`}>
              {getGradeMessage(percentage)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{quiz.questions?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {userSubmission.answers?.filter((answer, index) => 
                answer === quiz.questions[index]?.correctAnswer
              ).length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {(() => {
                const totalSeconds = userSubmission.timeTaken || 0;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                if (minutes > 0) {
                  return `${minutes}m ${seconds}s`;
                } else {
                  return `${seconds}s`;
                }
              })()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Time Taken</div>
          </div>
        </div>

        {/* Review Answers Button */}
        {quiz.showCorrectAnswers && (
          <div className="text-center mt-6">
            <Link
              to={`/dash/quizzes/${quizId}/review`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <FaEye />
              Review Answers
            </Link>
          </div>
        )}
      </div>



      {!quiz.showCorrectAnswers && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200 text-center">
            Detailed answer review is not available for this quiz.
          </p>
        </div>
      )}

      {/* Back to Quizzes Button */}
      <div className="text-center mt-6">
        <Link
          to="/dash/quizzes"
          className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <FaArrowLeft />
          Back to Quizzes
        </Link>
      </div>
    </main>
  );
};

export default QuizResults;