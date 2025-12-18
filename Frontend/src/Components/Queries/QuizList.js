import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import axios from "../../config/api/axios";
import { Link } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { FaPlus, FaTrash, FaEdit, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import InstantLoader from "../Layouts/InstantLoader";
import ErrorStrip from "../ErrorStrip";
import { useInstantData } from "../../Hooks/useInstantData";

const QuizList = () => {
  const { user } = useContext(UserContext);
  const { data: quizzesData, loading: globalLoading } = useInstantData('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState("");
  const [userPapers, setUserPapers] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  // Update quizzes when data is loaded
  useEffect(() => {
    if (quizzesData) {
      setQuizzes(quizzesData);
    }
  }, [quizzesData]);

  // Fetch user's papers
  useEffect(() => {
    const fetchUserPapers = async () => {
      if (!user._id) return;
      
      try {
        let endpoint;
        if (user.userType === 'student') {
          endpoint = `/paper/student/${user._id}`;
        } else if (user.userType === 'staff' || user.role === 'teacher' || user.role === 'HOD') {
          endpoint = `/paper/staff/${user._id}`;
        }
        
        if (endpoint) {
          const response = await axios.get(endpoint);
          setUserPapers(response.data || []);
          // Auto-select first paper if available
          if (response.data && response.data.length > 0) {
            setSelectedPaper(response.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching user papers:', err);
        setError("Error fetching papers");
      }
    };
    
    fetchUserPapers();
  }, [user]);

  const getQuizzes = useCallback(async (silentRefresh = false) => {
    if (!selectedPaper) {
      setQuizzes([]);
      setLoading(false);
      return;
    }

    // Only show loading state if it's not a silent refresh
    if (!silentRefresh) {
      setLoading(true);
    }
    try {
      let url = `/quizzes/${selectedPaper}`;
      
      // CRITICAL: For students, ALWAYS filter by their section
      if (user.userType === 'student' && user.section) {
        url += `?section=${user.section}`;
        console.log(`Student ${user.name} (${user.rollNo}) in section ${user.section} - fetching quizzes from: ${url}`);
      }
      // For teachers, filter by section if selected
      else if (user.userType === 'staff' && user.role === 'teacher' && selectedSection) {
        url += `?section=${selectedSection}`;
        console.log(`Teacher filtering by section ${selectedSection} - fetching from: ${url}`);
      }
      else {
        console.log(`Fetching all quizzes from: ${url}`);
      }
      
      // Add timeout for faster response feedback
      const response = await axios.get(url, { timeout: 10000 });
      const fetchedQuizzes = response.data || [];
      
      // ADDITIONAL CLIENT-SIDE FILTERING FOR STUDENTS (Double security)
      let filteredQuizzes = fetchedQuizzes;
      if (user.userType === 'student' && user.section) {
        filteredQuizzes = fetchedQuizzes.filter(quiz => {
          // Only show quizzes that are either:
          // 1. Specifically for the student's section
          // 2. Have no section specified (general quizzes)
          return !quiz.section || quiz.section === user.section;
        });
        
        console.log(`Original quizzes: ${fetchedQuizzes.length}, Filtered for section ${user.section}: ${filteredQuizzes.length}`);
        
        // Log any quizzes that were filtered out for debugging
        const filteredOut = fetchedQuizzes.filter(quiz => quiz.section && quiz.section !== user.section);
        if (filteredOut.length > 0) {
          console.warn(`Filtered out ${filteredOut.length} quizzes not for section ${user.section}:`, 
            filteredOut.map(q => ({ title: q.title, section: q.section })));
        }
      }
      
      setQuizzes(filteredQuizzes);
      setError("");
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      if (err.code === 'ECONNABORTED') {
        setError("Request timeout - please try again");
      } else {
        setError("Error fetching quizzes");
      }
      setQuizzes([]);
    } finally {
      // Only hide loading state if it was shown
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  }, [selectedPaper, selectedSection, user]);

  // Fetch quizzes when paper is selected
  useEffect(() => {
    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(getQuizzes, 300);
    return () => clearTimeout(timeoutId);
  }, [getQuizzes]);

  // Auto-refresh every 60 seconds (reduced frequency)
  useEffect(() => {
    if (!selectedPaper) return;
    
    const interval = setInterval(() => {
      // Silent refresh without showing loading state
      getQuizzes(true); // Pass true for silent refresh
    }, 60000); // 60 seconds (1 minute)

    return () => clearInterval(interval);
  }, [getQuizzes, selectedPaper]);

  // Refresh data when user returns to the page (e.g., after taking a quiz)
  useEffect(() => {
    const handleFocus = () => {
      if (selectedPaper) {
        getQuizzes(true); // Silent refresh when page gains focus
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [getQuizzes, selectedPaper]);

  const deleteQuiz = useCallback(async (quizId) => {
    try {
      const response = await axios.delete(`/quizzes/${quizId}`);
      toast.success(response.data.message);
      // Optimistically update UI
      setQuizzes(prev => prev.filter(quiz => quiz._id !== quizId));
    } catch (err) {
      toast.error('Error deleting quiz');
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const isActive = useCallback((startTime, endTime) => {
    const now = new Date();
    return now >= new Date(startTime) && now <= new Date(endTime);
  }, []);

  const isUpcoming = useCallback((startTime) => {
    return new Date(startTime) > new Date();
  }, []);

  // Memoize filtered quizzes for better performance
  const filteredQuizzes = useMemo(() => {
    if (!selectedSection) return quizzes;
    return quizzes.filter(quiz => quiz.section === selectedSection);
  }, [quizzes, selectedSection]);

  // Get selected paper details
  const currentPaper = userPapers.find(p => p._id === selectedPaper);

  return (
    <main className="quiz-list">
      <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Quizzes
      </h2>
      
      {/* Paper Selection */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">Select Paper:</label>
        <select
          value={selectedPaper}
          onChange={(e) => {
            setSelectedPaper(e.target.value);
            setSelectedSection(""); // Reset section when paper changes
          }}
          className="rounded border border-slate-400 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Choose a paper...</option>
          {userPapers.map((paper) => (
            <option key={paper._id} value={paper._id}>
              {paper.paper}
            </option>
          ))}
        </select>
      </div>

      {currentPaper && (
        <div className="mb-4">
          <p className="text-2xl font-bold">{currentPaper.paper}</p>
          {user.userType === 'student' && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>📍 Showing quizzes for your section only:</strong> {user.section}
              </p>
              <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                You will only see quizzes created specifically for section {user.section} or general quizzes without section restrictions.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Section Filter for Teachers */}
      {user.userType === 'staff' && user.role === 'teacher' && currentPaper?.sections?.length > 0 && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">
            Filter by Section:
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-slate-400 p-2 dark:border-slate-600">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="section"
                checked={selectedSection === ""}
                onChange={() => setSelectedSection("")}
                className="h-4 w-4 border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
              />
              <span className="text-sm font-medium">All Sections</span>
            </label>
            {currentPaper.sections.map((section, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="section"
                  checked={selectedSection === section}
                  onChange={() => setSelectedSection(section)}
                  className="h-4 w-4 border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
                />
                <span className="text-sm font-medium">{section}</span>
              </label>
            ))}
          </div>
          {selectedSection && (
            <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">
              Showing quizzes for Section: {selectedSection}
            </p>
          )}
        </div>
      )}

      {/* Add Quiz Button for Teachers and HODs */}
      {(user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')) && selectedPaper && (
        <div className="mb-4">
          <Link
            to="/dash/quizzes/add-quiz"
            className="inline-flex items-center gap-2 rounded-md border border-violet-900 bg-slate-800 px-4 py-2 font-semibold text-slate-200 hover:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900"
          >
            <FaPlus />
            Create Quiz
          </Link>
        </div>
      )}

      <div className="mt-4">
        {!selectedPaper ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Please select a paper to view quizzes</p>
          </div>
        ) : (loading || globalLoading) && !quizzes.length ? (
          <InstantLoader type="cards" rows={6} />
        ) : filteredQuizzes.length > 0 ? (
          <div className="space-y-4">
            {filteredQuizzes.map((quiz, index) => (
              <div
                key={quiz._id}
                className={`rounded-lg border p-4 ${
                  isActive(quiz.startTime, quiz.endTime)
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : isUpcoming(quiz.startTime)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{quiz.title}</h3>
                      {quiz.section && (
                        <span className="rounded bg-violet-600 px-2 py-1 text-xs text-white">
                          {quiz.section}
                        </span>
                      )}
                      {isActive(quiz.startTime, quiz.endTime) && (
                        <span className="rounded bg-green-600 px-2 py-1 text-xs text-white">
                          Active
                        </span>
                      )}
                      {isUpcoming(quiz.startTime) && (
                        <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
                          Upcoming
                        </span>
                      )}
                      {new Date() > new Date(quiz.endTime) && (
                        <span className="rounded bg-gray-600 px-2 py-1 text-xs text-white">
                          Ended
                        </span>
                      )}
                    </div>
                    
                    {quiz.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {quiz.description}
                      </p>
                    )}
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <p><strong>Duration:</strong> {quiz.duration} minutes</p>
                      <p><strong>Start Time:</strong> {formatDate(quiz.startTime)}</p>
                      <p><strong>End Time:</strong> {formatDate(quiz.endTime)}</p>
                      <p><strong>Questions:</strong> {quiz.questions?.length || 0}</p>
                      <p><strong>Submissions:</strong> {quiz.submissions?.length || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD') && (
                      <>
                        <Link
                          to={`${quiz._id}/edit`}
                          className="rounded p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit Quiz"
                        >
                          <FaEdit />
                        </Link>
                        <Link
                          to={`/dash/submissions/quiz/${quiz._id}`}
                          className="rounded p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20"
                          title="View Submissions"
                        >
                          <FaEye />
                        </Link>
                        <button
                          onClick={() => deleteQuiz(quiz._id)}
                          className="rounded p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Delete Quiz"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                    {user.userType === 'student' && (() => {
                      const hasSubmitted = quiz.submissions?.some(sub => sub.student?._id === user._id);
                      
                      // If student has submitted, always show "View Results" regardless of deadline
                      if (hasSubmitted) {
                        return (
                          <div className="flex gap-2">
                            <span className="rounded bg-green-600 px-3 py-1 text-sm text-white">
                              Submitted
                            </span>
                            <Link
                              to={`${quiz._id}/results`}
                              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                            >
                              View Results
                            </Link>
                          </div>
                        );
                      }
                      
                      // If quiz is active and not submitted, show "Take Quiz"
                      if (isActive(quiz.startTime, quiz.endTime)) {
                        return (
                          <Link
                            to={`${quiz._id}/take`}
                            className="rounded bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700"
                          >
                            Take Quiz
                          </Link>
                        );
                      }
                      
                      // If quiz is upcoming
                      if (isUpcoming(quiz.startTime)) {
                        return (
                          <span className="rounded bg-gray-400 px-3 py-1 text-sm text-white">
                            Not Started
                          </span>
                        );
                      }
                      
                      // If quiz has ended and no submission
                      return (
                        <span className="rounded bg-red-400 px-3 py-1 text-sm text-white">
                          Missed
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {(loading || globalLoading) && !quizzes.length ? <InstantLoader type="cards" rows={3} /> : <p className="text-gray-500">No quizzes found</p>}
          </div>
        )}
      </div>

      {error ? <ErrorStrip error={error} /> : ""}
    </main>
  );
};

export default QuizList; 