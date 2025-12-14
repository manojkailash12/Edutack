import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import { FaArrowLeft, FaArrowRight, FaClock, FaCheck, FaTimes } from "react-icons/fa";

const QuizTaker = () => {
  const { user } = useContext(UserContext);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Fetch available quizzes for student
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (user.userType !== 'student') return;
      
      setLoading(true);
      try {
        // First get user's papers, then get quizzes for those papers
        const papersResponse = await axios.get(`/paper/student/${user._id}`);
        const userPapers = papersResponse.data || [];
        
        if (userPapers.length === 0) {
          setQuizzes([]);
          return;
        }
        
        // Get quizzes for all user's papers
        const allQuizzes = [];
        for (const paper of userPapers) {
          try {
            const quizResponse = await axios.get(`/quizzes/${paper._id}?section=${user.section}`);
            const paperQuizzes = (quizResponse.data || []).map(quiz => ({
              ...quiz,
              paper: { _id: paper._id, paper: paper.paper }
            }));
            allQuizzes.push(...paperQuizzes);
          } catch (err) {
            console.error(`Error fetching quizzes for paper ${paper.paper}:`, err);
          }
        }
        
        setQuizzes(allQuizzes);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
        toast.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [user]);

  // Timer countdown
  useEffect(() => {
    if (quizStarted && timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizStarted && !quizCompleted) {
      // Auto-submit when time runs out
      handleSubmitQuiz(true);
    }
  }, [timeLeft, quizStarted, quizCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startQuiz = (quiz) => {
    // Check if student has already submitted
    const existingSubmission = quiz.submissions?.find(sub => sub.student === user._id);
    if (existingSubmission && !quiz.allowRetake) {
      toast.error('You have already taken this quiz');
      return;
    }

    // Check if quiz is active
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);
    
    if (now < startTime) {
      toast.error('Quiz has not started yet');
      return;
    }
    
    if (now > endTime) {
      toast.error('Quiz has ended');
      return;
    }

    setSelectedQuiz(quiz);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setTimeLeft(quiz.duration * 60); // Convert minutes to seconds
    setCurrentQuestion(0);
    setQuizStarted(true);
    setQuizCompleted(false);
    setResults(null);
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  const nextQuestion = () => {
    if (currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async (autoSubmit = false) => {
    if (hasSubmitted) return;
    
    setLoading(true);
    setHasSubmitted(true);
    
    try {
      const timeTaken = (selectedQuiz.duration * 60) - timeLeft;
      const response = await axios.post(`/quizzes/${selectedQuiz._id}/submit`, {
        student: user._id,
        answers: answers,
        timeTaken: timeTaken // Send in seconds as per model definition
      });

      setQuizCompleted(true);
      setQuizStarted(false);
      
      if (selectedQuiz.showResults) {
        setResults({
          score: response.data.score,
          totalMarks: response.data.totalMarks,
          percentage: Math.round((response.data.score / response.data.totalMarks) * 100),
          answers: answers,
          questions: selectedQuiz.questions
        });
      }

      toast.success(autoSubmit ? 'Quiz auto-submitted due to time limit' : 'Quiz submitted successfully!');
    } catch (err) {
      console.error('Error submitting quiz:', err);
      toast.error('Failed to submit quiz');
      setHasSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setResults(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setTimeLeft(0);
    setHasSubmitted(false);
  };

  if (loading) return <Loading />;

  if (user.userType !== 'student') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only students can take quizzes.</p>
      </div>
    );
  }

  // Quiz Results View
  if (quizCompleted && results) {
    return (
      <main className="quiz-results">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-green-600 mb-4">Quiz Completed!</h2>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-6">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {results.score}/{results.totalMarks}
                </div>
                <div className="text-2xl font-semibold text-green-600">
                  {results.percentage}%
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {results.percentage >= 80 ? 'Excellent!' : 
                   results.percentage >= 60 ? 'Good Job!' : 
                   results.percentage >= 40 ? 'Keep Practicing!' : 'Need Improvement'}
                </p>
              </div>
            </div>

            {selectedQuiz.showCorrectAnswers && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Review Your Answers</h3>
                <div className="space-y-6">
                  {selectedQuiz.questions.map((question, qIndex) => (
                    <div key={qIndex} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-sm font-medium text-gray-500">Q{qIndex + 1}</span>
                        <p className="font-medium">{question.question}</p>
                      </div>
                      
                      <div className="space-y-2 ml-8">
                        {question.options.map((option, oIndex) => {
                          const isCorrect = oIndex === question.correctAnswer;
                          const isSelected = results.answers[qIndex] === oIndex;
                          
                          return (
                            <div
                              key={oIndex}
                              className={`p-3 rounded-lg border ${
                                isCorrect
                                  ? 'bg-green-50 border-green-300 text-green-800'
                                  : isSelected && !isCorrect
                                  ? 'bg-red-50 border-red-300 text-red-800'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrect && <FaCheck className="text-green-600" />}
                                {isSelected && !isCorrect && <FaTimes className="text-red-600" />}
                                <span>{option}</span>
                                {isCorrect && <span className="text-xs font-medium">(Correct)</span>}
                                {isSelected && !isCorrect && <span className="text-xs font-medium">(Your Answer)</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={resetQuiz}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Back to Quizzes
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Quiz Taking View
  if (quizStarted && selectedQuiz) {
    const question = selectedQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;

    return (
      <main className="quiz-taking">
        <div className="max-w-4xl mx-auto p-6">
          {/* Quiz Header */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedQuiz.title}</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <FaClock />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <div className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {selectedQuiz.questions.length}
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Q{currentQuestion + 1}
                </span>
                <h3 className="text-xl font-medium leading-relaxed">{question.question}</h3>
              </div>
            </div>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    answers[currentQuestion] === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      value={index}
                      checked={answers[currentQuestion] === index}
                      onChange={() => handleAnswerSelect(currentQuestion, index)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-lg">{option}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
              >
                <FaArrowLeft /> Previous
              </button>

              <div className="flex gap-2">
                {selectedQuiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : answers[index] !== -1
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {currentQuestion === selectedQuiz.questions.length - 1 ? (
                <button
                  onClick={() => handleSubmitQuiz(false)}
                  disabled={hasSubmitted}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next <FaArrowRight />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Quiz List View
  return (
    <main className="quiz-list">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Available Quizzes
      </h2>

      {quizzes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 dark:text-gray-400">No quizzes available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const now = new Date();
            const startTime = new Date(quiz.startTime);
            const endTime = new Date(quiz.endTime);
            const hasSubmitted = quiz.submissions?.some(sub => sub.student === user._id);
            
            let status = 'upcoming';
            if (now >= startTime && now <= endTime) status = 'active';
            if (now > endTime) status = 'ended';
            if (hasSubmitted && !quiz.allowRetake) status = 'completed';

            return (
              <div key={quiz._id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{quiz.description}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><strong>Subject:</strong> {quiz.paper?.paper}</p>
                    <p><strong>Duration:</strong> {quiz.duration} minutes</p>
                    <p><strong>Questions:</strong> {quiz.questions?.length}</p>
                    <p><strong>Total Marks:</strong> {quiz.totalMarks}</p>
                    <p><strong>Start:</strong> {new Date(quiz.startTime).toLocaleString()}</p>
                    <p><strong>End:</strong> {new Date(quiz.endTime).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status === 'active' ? 'bg-green-100 text-green-800' :
                    status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {status === 'active' ? 'Active' :
                     status === 'upcoming' ? 'Upcoming' :
                     status === 'completed' ? 'Completed' :
                     'Ended'}
                  </span>

                  <button
                    onClick={() => startQuiz(quiz)}
                    disabled={status !== 'active' || (hasSubmitted && !quiz.allowRetake)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasSubmitted && !quiz.allowRetake ? 'Completed' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default QuizTaker;