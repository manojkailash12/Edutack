import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import Loading from '../Layouts/Loading';
import { FaArrowLeft, FaArrowRight, FaClock, FaCheck, FaFlag } from 'react-icons/fa';

const QuizTakeForm = () => {
  const { quizId } = useParams();
  const { user } = useContext(UserContext);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`/quizzes/quiz/${quizId}`);
        const quizData = response.data;
        
        // Check if quiz is active
        const now = new Date();
        const startTime = new Date(quizData.startTime);
        const endTime = new Date(quizData.endTime);
        
        if (now < startTime) {
          toast.error('Quiz has not started yet');
          navigate(-1);
          return;
        }
        
        if (now > endTime) {
          toast.error('Quiz has ended');
          navigate(-1);
          return;
        }
        
        // Check if student has already submitted this quiz
        const existingSub = quizData.submissions?.find(sub => sub.student === user._id);
        if (existingSub) {
          setAlreadySubmitted(true);
          setExistingSubmission(existingSub);
          setQuiz(quizData);
          return;
        }
        
        setQuiz(quizData);
        setAnswers(Array(quizData.questions.length).fill(null));
        setTimeLeft(quizData.duration * 60); // Convert minutes to seconds
      } catch (err) {
        toast.error('Error loading quiz');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, navigate, user._id]);

  const handleSubmit = useCallback(async (e, autoSubmit = false) => {
    if (e) e.preventDefault();
    
    const unanswered = answers.filter(ans => ans === null).length;
    if (unanswered > 0 && !autoSubmit) {
      toast.warning(`You have ${unanswered} unanswered questions. Submitting quiz...`);
    }
    
    setSubmitting(true);
    try {
      const timeTaken = quiz.duration * 60 - timeLeft; // Time taken in seconds
      const res = await axios.post(`/quizzes/${quizId}/submit`, {
        student: user._id,
        answers,
        timeTaken: timeTaken // Send in seconds for consistency
      });
      
      if (autoSubmit) {
        toast.success('Quiz auto-submitted due to time limit!');
      } else {
        toast.success('Quiz submitted successfully!');
      }
      
      if (quiz.showResults) {
        toast.success(`Your score: ${res.data.score}/${res.data.totalMarks}`);
      }
      
      // Redirect to results page after successful submission
      navigate(`/dash/quizzes/${quizId}/results`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  }, [answers, quiz, timeLeft, quizId, user._id, navigate]);

  // Timer countdown
  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizStarted) {
      // Auto-submit when time runs out
      handleSubmit(null, true);
    }
  }, [timeLeft, quizStarted, handleSubmit]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startQuiz = () => {
    setQuizStarted(true);
  };

  const handleOptionChange = (optIdx) => {
    setAnswers(prev => prev.map((ans, i) => (i === currentQuestion ? optIdx : ans)));
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  const toggleFlag = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  if (loading) return <Loading />;
  if (!quiz) return <div className="text-center mt-8">Quiz not found.</div>;

  // Already submitted screen
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheck className="text-3xl text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Already Submitted</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You have already submitted this quiz: <strong>{quiz.title}</strong>
          </p>
          
          {existingSubmission && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Your Submission Details:</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Submitted At:</strong> {new Date(existingSubmission.submittedAt).toLocaleString()}</p>
                <p><strong>Time Taken:</strong> {(() => {
                  const totalSeconds = existingSubmission.timeTaken || 0;
                  const minutes = Math.floor(totalSeconds / 60);
                  const seconds = totalSeconds % 60;
                  return minutes > 0 ? `${minutes} min ${seconds} sec` : `${seconds} sec`;
                })()}</p>
                {existingSubmission.score !== undefined && (
                  <p><strong>Score:</strong> {existingSubmission.score}/{quiz.totalMarks || quiz.questions?.length || 0}</p>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <FaArrowLeft />
            <span>Back to Quizzes</span>
          </button>
        </div>
      </div>
    );
  }

  // Quiz start screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaClock className="text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-6">{quiz.description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quiz.questions.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Questions</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quiz.duration}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Minutes</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              <p>• You have {quiz.duration} minutes to complete this quiz</p>
              <p>• Each question must be answered</p>
              <p>• You can navigate between questions</p>
              <p>• Quiz will auto-submit when time expires</p>
            </div>
            
            <button
              onClick={startQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{quiz.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                timeLeft < 300 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                <FaClock />
                <span className="font-mono text-lg font-semibold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : answers[index] !== null
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : flaggedQuestions.has(index)
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Current</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Flagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {/* Question Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                        Question {currentQuestion + 1}
                      </span>
                      <button
                        onClick={toggleFlag}
                        className={`p-2 rounded-lg transition-colors ${
                          flaggedQuestions.has(currentQuestion)
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                        }`}
                        title="Flag for review"
                      >
                        <FaFlag />
                      </button>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                      {currentQ.question}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="p-6">
                <div className="space-y-3">
                  {currentQ.options.map((option, index) => (
                    <label
                      key={index}
                      className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name={`question-${currentQuestion}`}
                          value={index}
                          checked={answers[currentQuestion] === index}
                          onChange={() => handleOptionChange(index)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-lg text-gray-900 dark:text-white">{option}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center">
                  <button
                    onClick={prevQuestion}
                    disabled={currentQuestion === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                  >
                    <FaArrowLeft />
                    <span>Previous</span>
                  </button>

                  <div className="flex space-x-3">
                    {currentQuestion === quiz.questions.length - 1 ? (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <FaCheck />
                        <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={nextQuestion}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span>Next</span>
                        <FaArrowRight />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakeForm; 