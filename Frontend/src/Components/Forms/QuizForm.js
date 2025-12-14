import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import { useNavigate, Navigate, useParams } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import { FaPlus, FaTrash } from "react-icons/fa";
import ErrorStrip from "../ErrorStrip";

const QuizForm = () => {
  const { user } = useContext(UserContext);
  const { quizId } = useParams(); // Get quizId from URL for editing
  const isEditing = Boolean(quizId);
  
  const [quiz, setQuiz] = useState({
    paper: "",
    title: "",
    description: "",
    section: "",
    duration: 30,
    startTime: "",
    endTime: "",
  });
  const [selectedSections, setSelectedSections] = useState([]);
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswer: 0, marks: 1 }
  ]);
  const [teacherPapers, setTeacherPapers] = useState([]);
  const [selectedPaperSections, setSelectedPaperSections] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch teacher's papers and sections
  useEffect(() => {
    const fetchTeacherPapers = async () => {
      console.log('=== FETCHING TEACHER PAPERS FOR QUIZ ===');
      console.log('User ID:', user._id);
      console.log('User role:', user.role);
      console.log('User type:', user.userType);
      
      try {
        // Try the quiz-specific endpoint first
        let response;
        try {
          response = await axios.get(`/quizzes/teacher-papers/${user._id}`);
          console.log('Quiz teacher papers response:', response.data);
        } catch (quizErr) {
          console.log('Quiz endpoint failed, trying general paper endpoint:', quizErr.response?.status);
          // Fallback to general paper endpoint
          response = await axios.get(`/paper/staff/${user._id}`);
          console.log('General papers response:', response.data);
        }
        
        setTeacherPapers(response.data || []);
        
        if (!response.data || response.data.length === 0) {
          console.log('No papers found for user');
          toast.warning('No papers assigned to you. Please contact admin if this is incorrect.');
        }
      } catch (err) {
        console.error('Error fetching teacher papers:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        // Show user-friendly error message
        const errorMessage = err.response?.status === 404 
          ? 'No papers found. Please contact admin to assign papers to you.'
          : 'Error loading papers: ' + (err.response?.data?.message || err.message);
        
        toast.error(errorMessage);
        setTeacherPapers([]);
      }
    };
    
    if (user._id && user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')) {
      fetchTeacherPapers();
    } else {
      console.log('User does not meet criteria for fetching papers:', {
        hasUserId: !!user._id,
        userType: user.userType,
        role: user.role
      });
    }
  }, [user]);

  // Fetch existing quiz data when editing (only after teacher papers are loaded)
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!isEditing || !quizId) return;
      
      // Wait for teacher papers to be loaded first
      if (teacherPapers.length === 0) {
        console.log('Waiting for teacher papers to load before fetching quiz data...');
        return;
      }
      
      console.log('=== FETCHING QUIZ DATA FOR EDITING ===');
      console.log('Quiz ID:', quizId);
      
      setLoading(true);
      try {
        const response = await axios.get(`/quizzes/quiz/${quizId}`);
        const quizData = response.data;
        
        console.log('Quiz data received:', quizData);
        
        // Format dates for datetime-local input
        const formatDateTime = (dateString) => {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16);
        };
        
        setQuiz({
          paper: quizData.paper._id || quizData.paper,
          title: quizData.title,
          description: quizData.description || "",
          section: quizData.section || "",
          duration: quizData.duration,
          startTime: formatDateTime(quizData.startTime),
          endTime: formatDateTime(quizData.endTime),
        });
        
        setQuestions(quizData.questions || []);
        
        if (quizData.section) {
          setSelectedSections([quizData.section]);
        }
        
        console.log('Quiz state updated successfully');
      } catch (err) {
        console.error('Error fetching quiz data:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        toast.error('Error loading quiz data: ' + (err.response?.data?.message || err.message));
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizData();
  }, [isEditing, quizId, navigate, teacherPapers]);

  // When paper changes, update available sections
  useEffect(() => {
    if (quiz.paper && teacherPapers.length > 0) {
      const selectedPaper = teacherPapers.find(p => p._id === quiz.paper);
      if (selectedPaper) {
        setSelectedPaperSections(selectedPaper.sections);
        setSelectedSections([]);
        setQuiz(prev => ({ ...prev, section: '' }));
      }
    }
  }, [quiz.paper, teacherPapers]);

  const handleFormChange = (e) => {
    setQuiz({ ...quiz, [e.target.id]: e.target.value });
  };

  const toggleSection = (sec) => {
    setSelectedSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0, marks: 1 }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quiz.paper || !quiz.title || !quiz.startTime || !quiz.endTime) {
      toast.error('Please fill all required fields');
      return;
    }
    
    // For editing, we work with single section, for creating we can have multiple
    const secs = isEditing ? [quiz.section].filter(Boolean) : 
                 selectedSections.length ? selectedSections : [quiz.section].filter(Boolean);
    
    if (!secs.length) {
      toast.error('Please select at least one section');
      return;
    }
    
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) { toast.error(`Question ${i + 1} is empty`); return; }
      if (q.options.some(opt => !opt.trim())) { toast.error(`Question ${i + 1} has empty options`); return; }
    }

    setIsCreating(true);
    try {
      if (isEditing) {
        // Update existing quiz
        console.log('=== UPDATING QUIZ ===');
        console.log('Quiz ID:', quizId);
        console.log('Update data:', { 
          ...quiz, 
          section: secs[0], 
          questions, 
          teacherId: user._id 
        });
        
        const response = await axios.put(`/quizzes/${quizId}`, { 
          ...quiz, 
          section: secs[0], 
          questions, 
          teacherId: user._id 
        });
        
        console.log('Update response:', response.data);
        toast.success('Quiz updated successfully');
      } else {
        // Create new quizzes
        await Promise.all(secs.map(sec => 
          axios.post('/quizzes', { 
            ...quiz, 
            section: sec, 
            questions, 
            teacherId: user._id 
          })
        ));
        toast.success('Quizzes created successfully');
      }
      navigate(-1);
    } catch (err) {
      console.error('Error saving quiz:', err);
      toast.error(err.response?.data?.message || `Error ${isEditing ? 'updating' : 'creating'} quiz`);
      setError(err.response?.data?.message || `Error ${isEditing ? 'updating' : 'creating'} quiz`);
    } finally {
      setIsCreating(false);
    }
  };

  if (user.userType !== 'staff' || (user.role !== 'teacher' && user.role !== 'HOD')) return <Navigate to="/dash" />;

  if (loading) {
    return (
      <main className="quiz">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-900 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading quiz data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="quiz">
      <h2 className="mb-2 mt-3 text-6xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400">
        {isEditing ? 'Edit Quiz' : 'Create Quiz'}
      </h2>
      <h3 className="text-2xl font-medium mb-4">
        {isEditing ? 'Edit quiz details and questions' : 'Create quiz for your assigned sections'}
      </h3>
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Debug Info:</strong> Papers loaded: {teacherPapers.length}, Quiz ID: {quizId || 'N/A'}, Is Editing: {isEditing.toString()}
          </p>
        </div>
      )}
      
      <form className="w-full md:w-2/3">
        <div className="mb-4">
          <label htmlFor="paper" className="block text-lg font-medium">Select Paper:</label>
          <select className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400" id="paper" value={quiz.paper} onChange={handleFormChange} required>
            <option value="">
              {teacherPapers.length === 0 ? 'Loading papers...' : 'Select Paper'}
            </option>
            {teacherPapers.map((paper, index) => (
              <option key={index} value={paper._id}>
                {paper.paper} {paper.sections ? `- ${paper.sections.join(', ')}` : ''}
              </option>
            ))}
          </select>
          {teacherPapers.length === 0 && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No papers found. Please ensure you have papers assigned to you.
            </p>
          )}
        </div>

        {quiz.paper && (
          <div className="mb-4">
            <label className="block text-lg font-medium">Select Section(s):</label>
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-slate-400 p-3 dark:border-slate-600">
              {selectedPaperSections.map((section, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={selectedSections.includes(section)} onChange={() => toggleSection(section)} className="h-4 w-4 rounded border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400" />
                  <span className="text-sm font-medium">{section}</span>
                </label>
              ))}
            </div>
            {selectedSections.length > 0 && (
              <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">Selected: {selectedSections.join(', ')}</p>
            )}
          </div>
        )}

        {/* rest of form remains the same */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-lg font-medium">Quiz Title:</label>
          <input className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400" type="text" id="title" value={quiz.title} onChange={handleFormChange} required placeholder="Enter quiz title..." />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-lg font-medium">Description (Optional):</label>
          <textarea className="block w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400" rows="3" id="description" value={quiz.description} onChange={handleFormChange} placeholder="Enter quiz description..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="duration" className="block text-lg font-medium">Duration (minutes):</label>
            <input className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400" type="number" id="duration" min="5" max="180" value={quiz.duration} onChange={handleFormChange} required />
          </div>
          <div>
            <label htmlFor="startTime" className="block text-lg font-medium">Start Time:</label>
            <input className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400" type="datetime-local" id="startTime" value={quiz.startTime} onChange={handleFormChange} required />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-lg font-medium">End Time:</label>
            <input className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active-border-violet-400" type="datetime-local" id="endTime" value={quiz.endTime} onChange={handleFormChange} required />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Questions</h3>
            <button type="button" onClick={addQuestion} className="flex items-center gap-2 rounded bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700"><FaPlus />Add Question</button>
          </div>

          {questions.map((question, qIndex) => (
            <div key={qIndex} className="mb-6 rounded-lg border border-slate-300 p-4 dark:border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium">Question {qIndex + 1}</h4>
                {questions.length > 1 && <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-600 hover:text-red-800"><FaTrash /></button>}
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Question:</label>
                <textarea className="block w-full rounded-md border border-slate-400 p-2 focus:border-violet-900 dark:border-slate-600 dark:bg-slate-800" rows="2" value={question.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)} placeholder="Enter your question..." />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Options:</label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2 mb-2">
                    <input type="radio" name={`correct-${qIndex}`} checked={question.correctAnswer === oIndex} onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)} className="text-violet-900 focus:ring-violet-900" />
                    <input type="text" className="flex-1 rounded-md border border-slate-400 p-2 focus:border-violet-900 dark:border-slate-600 dark:bg-slate-800" value={option} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marks:</label>
                  <input type="number" min="1" max="10" className="w-20 rounded-md border border-slate-400 p-2 focus:border-violet-900 dark:border-slate-600 dark:bg-slate-800" value={question.marks} onChange={(e) => updateQuestion(qIndex, 'marks', parseInt(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="mb-4 flex h-10 w-auto items-center gap-2 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 px-6 py-2 font-semibold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900" type="submit" onClick={handleSubmit} disabled={isCreating || loading}>
          <FaPlus />
          {loading ? 'Loading...' : isCreating ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Quiz' : 'Create Quiz')}
        </button>
      </form>
      
      {error ? <ErrorStrip error={error} /> : ""}
    </main>
  );
};

export default QuizForm; 