import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import { FaPlus, FaTrash, FaSave, FaEye } from "react-icons/fa";

const QuizCreator = () => {
  const { user } = useContext(UserContext);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState({
    paper: "",
    title: "",
    description: "",
    section: "",
    duration: 30,
    startTime: "",
    endTime: "",
    allowRetake: false,
    showResults: true,
    showCorrectAnswers: true,
    questions: [
      {
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        marks: 1
      }
    ]
  });

  // Fetch teacher's papers
  useEffect(() => {
    const fetchPapers = async () => {
      if (user.role !== 'teacher' && user.role !== 'HOD') return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/quizzes/teacher-papers/${user._id}`);
        setPapers(response.data || []);
      } catch (err) {
        console.error('Error fetching papers:', err);
        toast.error('Failed to load papers');
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [user]);

  const handleInputChange = (field, value) => {
    setQuizData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[questionIndex][field] = value;
    setQuizData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuizData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const addQuestion = () => {
    setQuizData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          options: ["", "", "", ""],
          correctAnswer: 0,
          marks: 1
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (quizData.questions.length > 1) {
      const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
      setQuizData(prev => ({
        ...prev,
        questions: updatedQuestions
      }));
    }
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[questionIndex].options.push("");
    setQuizData(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...quizData.questions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      // Adjust correct answer if needed
      if (updatedQuestions[questionIndex].correctAnswer >= optionIndex) {
        updatedQuestions[questionIndex].correctAnswer = Math.max(0, updatedQuestions[questionIndex].correctAnswer - 1);
      }
      setQuizData(prev => ({
        ...prev,
        questions: updatedQuestions
      }));
    }
  };

  const validateQuiz = () => {
    if (!quizData.paper || !quizData.title || !quizData.startTime || !quizData.endTime) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (new Date(quizData.startTime) >= new Date(quizData.endTime)) {
      toast.error('End time must be after start time');
      return false;
    }

    for (let i = 0; i < quizData.questions.length; i++) {
      const question = quizData.questions[i];
      if (!question.question.trim()) {
        toast.error(`Question ${i + 1} is empty`);
        return false;
      }
      
      const validOptions = question.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error(`Question ${i + 1} must have at least 2 options`);
        return false;
      }

      if (!question.options[question.correctAnswer]?.trim()) {
        toast.error(`Question ${i + 1} has invalid correct answer`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateQuiz()) return;

    setLoading(true);
    try {
      await axios.post('/quizzes', {
        ...quizData,
        teacherId: user._id
      });
      
      toast.success('Quiz created successfully!');
      
      // Reset form
      setQuizData({
        paper: "",
        title: "",
        description: "",
        section: "",
        duration: 30,
        startTime: "",
        endTime: "",
        allowRetake: false,
        showResults: true,
        showCorrectAnswers: true,
        questions: [
          {
            question: "",
            options: ["", "", "", ""],
            correctAnswer: 0,
            marks: 1
          }
        ]
      });
    } catch (err) {
      console.error('Error creating quiz:', err);
      toast.error(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSections = () => {
    const selectedPaper = papers.find(p => p._id === quizData.paper);
    return selectedPaper?.sections || [];
  };

  if (loading) return <Loading />;

  if (user.role !== 'teacher' && user.role !== 'HOD') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only teachers and HODs can create quizzes.</p>
      </div>
    );
  }

  return (
    <main className="quiz-creator">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Create Quiz
      </h2>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        {/* Basic Quiz Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Quiz Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Paper *</label>
              <select
                value={quizData.paper}
                onChange={(e) => handleInputChange('paper', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select Paper</option>
                {papers.map(paper => (
                  <option key={paper._id} value={paper._id}>{paper.paper}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Section</label>
              <select
                value={quizData.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Sections</option>
                {getAvailableSections().map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Quiz Title *</label>
            <input
              type="text"
              value={quizData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter quiz title"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={quizData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
              placeholder="Enter quiz description (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
              <input
                type="number"
                value={quizData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Time *</label>
              <input
                type="datetime-local"
                value={quizData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Time *</label>
              <input
                type="datetime-local"
                value={quizData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizData.allowRetake}
                onChange={(e) => handleInputChange('allowRetake', e.target.checked)}
                className="mr-2"
              />
              Allow Retakes
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizData.showResults}
                onChange={(e) => handleInputChange('showResults', e.target.checked)}
                className="mr-2"
              />
              Show Results Immediately
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quizData.showCorrectAnswers}
                onChange={(e) => handleInputChange('showCorrectAnswers', e.target.checked)}
                className="mr-2"
              />
              Show Correct Answers
            </label>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FaPlus /> Add Question
            </button>
          </div>

          {quizData.questions.map((question, qIndex) => (
            <div key={qIndex} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Question {qIndex + 1}</h4>
                {quizData.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows="2"
                  placeholder="Enter your question"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Options</label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={question.correctAnswer === oIndex}
                      onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                      className="text-green-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder={`Option ${oIndex + 1}`}
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Option
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Marks</label>
                <input
                  type="number"
                  value={question.marks}
                  onChange={(e) => handleQuestionChange(qIndex, 'marks', parseInt(e.target.value) || 1)}
                  className="w-20 border rounded-lg px-3 py-2"
                  min="1"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 mx-auto"
          >
            <FaSave /> {loading ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </main>
  );
};

export default QuizCreator;