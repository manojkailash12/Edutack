import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import { FaCheck, FaTimes, FaArrowLeft, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";

const QuizReview = () => {
  const { quizId } = useParams();
  const { user } = useContext(UserContext);
  const [quiz, setQuiz] = useState(null);
  const [userSubmission, setUserSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const fetchQuizReview = async () => {
      try {
        setLoading(true);
        
        const quizResponse = await axios.get(`/quizzes/quiz/${quizId}`);
        const quizData = quizResponse.data;
        setQuiz(quizData);

        const submission = quizData.submissions?.find(sub => sub.student._id === user._id);
        if (submission) {
          setUserSubmission(submission);
        } else {
          setError("No submission found for this quiz");
        }
      } catch (err) {
        console.error('Error fetching quiz review:', err);
        setError("Error loading quiz review");
        toast.error("Failed to load quiz review");
      } finally {
        setLoading(false);
      }
    };

    if (quizId && user._id) {
      fetchQuizReview();
    }
  }, [quizId, user._id]);

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          to={`/dash/quizzes/${quizId}/results`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Results
        </Link>
      </div>
    );
  }

  if (!quiz || !userSubmission) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">No Review Available</h2>
        <p className="text-gray-600 mb-4">You haven't submitted this quiz yet or review is not available.</p>
        <Link
          to={`/dash/quizzes/${quizId}/results`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Results
        </Link>
      </div>
    );
  }

  if (!quiz.showCorrectAnswers) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">Review Not Available</h2>
        <p className="text-gray-600 mb-4">The teacher has not enabled detailed answer review for this quiz.</p>
        <Link
          to={`/dash/quizzes/${quizId}/results`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Results
        </Link>
      </div>
    );
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">No Questions Available</h2>
        <p className="text-gray-600 mb-4">This quiz doesn't have any questions to review.</p>
        <Link
          to={`/dash/quizzes/${quizId}/results`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft /> Back to Results
        </Link>
      </div>
    );
  }

  const percentage = Math.round((userSubmission.score / quiz.totalMarks) * 100);
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const qUserAnswer = userSubmission.answers[currentQuestionIndex];
  const qCorrectAnswer = currentQuestion.correctAnswer;
  const qIsCorrect = qUserAnswer === qCorrectAnswer;

  return (
    <main className="quiz-review p-4 max-w-7xl mx-auto">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/dash/quizzes/${quizId}/results`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Answer Review</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.title} - {quiz.paper?.paper}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Score: {userSubmission.score}/{quiz.totalMarks}</div>
        </div>
      </div>

      {/* Main Content Area - Two Columns */}
      <div className="flex gap-4">
        {/* Left Column - Question Navigation & Controls */}
        <div className="w-80 flex flex-col gap-4">
          {/* Question Navigation */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Navigation</h3>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {quiz.questions.map((_, index) => {
                const isAnswered = userSubmission.answers[index] !== undefined;
                const isCorrect = userSubmission.answers[index] === quiz.questions[index].correctAnswer;
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`w-8 h-8 rounded-lg font-medium text-xs transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : isAnswered
                        ? isCorrect
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Navigation Controls */}
            <div className="flex gap-2">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500'
                }`}
              >
                <FaChevronLeft className="text-xs" />
                Prev
              </button>

              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentQuestionIndex === quiz.questions.length - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
                }`}
              >
                Next
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>

          {/* Question Result Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} Result:
              </span>
              <div className="flex-shrink-0">
                {qIsCorrect ? (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium dark:bg-green-800 dark:text-green-200 flex items-center gap-1">
                    <FaCheck className="text-xs" />
                    +{currentQuestion.marks || 1}
                  </div>
                ) : (
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium dark:bg-red-800 dark:text-red-200 flex items-center gap-1">
                    <FaTimes className="text-xs" />
                    0
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <span className={`text-lg font-bold ${qIsCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {qIsCorrect ? 'Correct' : 'Incorrect'}
              </span>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Points: {qIsCorrect ? (currentQuestion.marks || 1) : 0}/{currentQuestion.marks || 1}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Current Question */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium flex-shrink-0">
              Q{currentQuestionIndex + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-lg leading-tight">{currentQuestion.question}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {currentQuestion.options?.map((option, oIndex) => {
              const isUserAnswer = qUserAnswer === oIndex;
              const isCorrectOption = qCorrectAnswer === oIndex;
              
              let className = "p-4 rounded-lg border-2 transition-all ";
              if (isCorrectOption) {
                className += "bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-600 dark:text-green-200";
              } else if (isUserAnswer && !isCorrectOption) {
                className += "bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-200";
              } else {
                className += "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600";
              }

              return (
                <div key={oIndex} className={className}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCorrectOption && <FaCheck className="text-green-600" />}
                        {isUserAnswer && !isCorrectOption && <FaTimes className="text-red-600" />}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {String.fromCharCode(65 + oIndex)}.
                        </span>
                      </div>
                      <span className="flex-1 min-w-0">{option}</span>
                    </div>
                    <div className="flex gap-2 text-xs font-medium flex-shrink-0 ml-2">
                      {isCorrectOption && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-800 dark:text-green-200">
                          Correct
                        </span>
                      )}
                      {isUserAnswer && (
                        <span className={`px-2 py-1 rounded ${
                          isCorrectOption 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          Your Answer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default QuizReview;