import { useState, useEffect, useContext, useRef } from "react";
import axios from "../../config/api/axios";
import { useNavigate, Navigate, useParams } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import { FaPlus, FaUpload, FaTrash, FaEdit } from "react-icons/fa";
import ErrorStrip from "../ErrorStrip";

const AssignmentForm = () => {
  const { user } = useContext(UserContext);
  const { assignmentId } = useParams(); // Get assignmentId from URL for editing
  const isEditing = Boolean(assignmentId);
  
  const [assignment, setAssignment] = useState({
    paper: "",
    title: "",
    description: "",
    instructions: "",
    section: "",
    dueDate: "",
    maxMarks: 10,
    allowLateSubmission: false,
    allowRetake: false,
  });
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [teacherPapers, setTeacherPapers] = useState([]);
  const [selectedPaperSections, setSelectedPaperSections] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Fetch assignment data when editing
  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (isEditing && assignmentId) {
        try {
          const response = await axios.get(`/assignments/assignment/${assignmentId}`);
          const assignmentData = response.data;
          
          // Format the date for datetime-local input
          const formattedDate = new Date(assignmentData.dueDate).toISOString().slice(0, 16);
          
          setAssignment({
            paper: assignmentData.paper._id || assignmentData.paper,
            title: assignmentData.title,
            description: assignmentData.description,
            instructions: assignmentData.instructions || "",
            section: assignmentData.section || "",
            dueDate: formattedDate,
            maxMarks: assignmentData.maxMarks,
            allowLateSubmission: assignmentData.allowLateSubmission,
            allowRetake: assignmentData.allowRetake,
          });
          
          if (assignmentData.section) {
            setSelectedSections([assignmentData.section]);
          }
        } catch (err) {
          console.error('Error fetching assignment:', err);
          toast.error('Error loading assignment data');
          navigate(-1);
        }
      }
    };
    
    fetchAssignmentData();
  }, [isEditing, assignmentId, navigate]);

  // Fetch teacher's papers and sections
  useEffect(() => {
    const fetchTeacherPapers = async () => {
      console.log('=== FETCHING TEACHER PAPERS DEBUG ===');
      console.log('User object:', user);
      console.log('User ID:', user._id);
      console.log('User role:', user.role);
      console.log('User userType:', user.userType);
      
      try {
        const response = await axios.get(`/assignments/teacher-papers/${user._id}`);
        console.log('Papers response:', response.data);
        setTeacherPapers(response.data);
      } catch (err) {
        console.error('Error fetching teacher papers:', err);
        console.error('Error details:', err.response?.data || err.message);
      }
    };
    
    console.log('Checking user conditions:', {
      userType: user.userType,
      role: user.role,
      shouldFetch: user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')
    });
    
    if (user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')) {
      fetchTeacherPapers();
    } else {
      console.log('User does not meet conditions for fetching papers');
    }
  }, [user]);

  // When paper changes, update available sections
  useEffect(() => {
    if (assignment.paper && teacherPapers.length > 0) {
      const selectedPaper = teacherPapers.find(p => p._id === assignment.paper);
      if (selectedPaper) {
        setSelectedPaperSections(selectedPaper.sections);
        setSelectedSections([]);
        setAssignment(prev => ({ ...prev, section: '' }));
      }
    }
  }, [assignment.paper, teacherPapers]);

  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setAssignment({
      ...assignment,
      [id]: type === 'checkbox' ? checked : value
    });
  };

  const toggleSection = (sec) => {
    setSelectedSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} has unsupported format`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return;
      }
    }
    
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assignment.paper || !assignment.title || !assignment.description || !assignment.dueDate) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (isEditing) {
      // Update existing assignment
      setIsCreating(true);
      try {
        const formData = new FormData();
        formData.append('paper', assignment.paper);
        formData.append('title', assignment.title);
        formData.append('description', assignment.description);
        formData.append('instructions', assignment.instructions);
        formData.append('section', assignment.section);
        formData.append('dueDate', assignment.dueDate);
        formData.append('maxMarks', assignment.maxMarks);
        formData.append('allowLateSubmission', assignment.allowLateSubmission);
        formData.append('allowRetake', assignment.allowRetake);
        formData.append('teacherId', user._id);
        
        // Append files
        selectedFiles.forEach(file => {
          formData.append('attachments', file);
        });
        
        await axios.put(`/assignments/${assignmentId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.success('Assignment updated successfully');
        navigate(-1);
      } catch (err) {
        setError(err);
        toast.error(err?.response?.data?.message || 'Error updating assignment');
      } finally {
        setIsCreating(false);
      }
    } else {
      // Create new assignment(s)
      const secs = selectedSections.length ? selectedSections : [assignment.section].filter(Boolean);
      if (!secs.length) {
        toast.error('Please select at least one section');
        return;
      }

      setIsCreating(true);
      try {
        // Create assignments for each selected section
        await Promise.all(secs.map(async (sec) => {
          const formData = new FormData();
          formData.append('paper', assignment.paper);
          formData.append('title', assignment.title);
          formData.append('description', assignment.description);
          formData.append('instructions', assignment.instructions);
          formData.append('section', sec);
          formData.append('dueDate', assignment.dueDate);
          formData.append('maxMarks', assignment.maxMarks);
          formData.append('allowLateSubmission', assignment.allowLateSubmission);
          formData.append('allowRetake', assignment.allowRetake);
          formData.append('teacherId', user._id);
          
          // Append files
          selectedFiles.forEach(file => {
            formData.append('attachments', file);
          });
          
          await axios.post('/assignments', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }));
        
        toast.success('Assignment(s) created successfully');
        navigate(-1);
      } catch (err) {
        setError(err);
        toast.error(err?.response?.data?.message || 'Error creating assignment');
      } finally {
        setIsCreating(false);
      }
    }
  };

  if (user.userType !== 'staff' || (user.role !== 'teacher' && user.role !== 'HOD')) {
    return <Navigate to="/dash" />;
  }

  return (
    <main className="assignment-form">
      <h2 className="mb-2 mt-3 text-6xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400">
        {isEditing ? 'Edit Assignment' : 'Create Assignment'}
      </h2>
      <h3 className="text-2xl font-medium mb-4">
        {isEditing ? 'Update assignment details' : 'Create assignment for your assigned sections'}
      </h3>
      
      <form className="w-full md:w-2/3" onSubmit={handleSubmit}>
        {/* Paper Selection */}
        <div className="mb-4">
          <label htmlFor="paper" className="block text-lg font-medium">
            Select Paper:
          </label>
          <select
            className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="paper"
            value={assignment.paper}
            onChange={handleFormChange}
            required
          >
            <option value="">Select a paper</option>
            {teacherPapers.map((paper) => (
              <option key={paper._id} value={paper._id}>
                {paper.paper}
              </option>
            ))}
          </select>
        </div>

        {/* Section Selection */}
        {selectedPaperSections.length > 0 && !isEditing && (
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">
              Select Sections:
            </label>
            <div className="grid grid-cols-4 gap-2 rounded-md border border-slate-400 p-2 dark:border-slate-600">
              {selectedPaperSections.map((section, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section)}
                    onChange={() => toggleSection(section)}
                    className="h-4 w-4 border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
                  />
                  <span className="text-sm font-medium">{section}</span>
                </label>
              ))}
            </div>
            {selectedSections.length > 0 && (
              <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">
                Selected: {selectedSections.join(', ')}
              </p>
            )}
          </div>
        )}
        
        {/* Show current section when editing */}
        {isEditing && assignment.section && (
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">
              Section:
            </label>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
              <span className="font-medium">{assignment.section}</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Section cannot be changed when editing an assignment
              </p>
            </div>
          </div>
        )}

        {/* Assignment Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-lg font-medium">
            Assignment Title:
          </label>
          <input
            type="text"
            className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="title"
            value={assignment.title}
            onChange={handleFormChange}
            placeholder="Enter assignment title"
            required
          />
        </div>

        {/* Assignment Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-lg font-medium">
            Assignment Description:
          </label>
          <textarea
            className="block w-full rounded-md border-[1.5px] border-solid border-slate-400 p-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="description"
            rows="4"
            value={assignment.description}
            onChange={handleFormChange}
            placeholder="Enter assignment description"
            required
          />
        </div>

        {/* Assignment Instructions */}
        <div className="mb-4">
          <label htmlFor="instructions" className="block text-lg font-medium">
            Additional Instructions (Optional):
          </label>
          <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>📋 Note:</strong> Use this field to provide specific instructions for this assignment.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Include any special requirements, formatting guidelines, or submission details.
            </p>
          </div>
          <textarea
            className="block w-full rounded-md border-[1.5px] border-solid border-slate-400 p-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="instructions"
            rows="3"
            value={assignment.instructions}
            onChange={handleFormChange}
            placeholder="Enter any additional specific instructions for this assignment (e.g., reference materials, specific formatting requirements, etc.)"
          />
        </div>

        {/* Due Date */}
        <div className="mb-4">
          <label htmlFor="dueDate" className="block text-lg font-medium">
            Due Date:
          </label>
          <input
            type="datetime-local"
            className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="dueDate"
            value={assignment.dueDate}
            onChange={handleFormChange}
            required
          />
        </div>

        {/* Max Marks */}
        <div className="mb-4">
          <label htmlFor="maxMarks" className="block text-lg font-medium">
            Maximum Marks:
          </label>
          <input
            type="number"
            min="1"
            max="100"
            className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="maxMarks"
            value={assignment.maxMarks}
            onChange={handleFormChange}
            required
          />
        </div>

        {/* Assignment Options */}
        <div className="mb-4 space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowLateSubmission"
              checked={assignment.allowLateSubmission}
              onChange={handleFormChange}
              className="h-4 w-4 border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
            />
            <span className="text-sm font-medium">Allow late submissions</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowRetake"
              checked={assignment.allowRetake}
              onChange={handleFormChange}
              className="h-4 w-4 border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
            />
            <span className="text-sm font-medium">Allow resubmissions</span>
          </label>
        </div>

        {/* File Attachments */}
        <div className="mb-4">
          <label className="block text-lg font-medium mb-2">
            Attach Files (Optional):
          </label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
            >
              <FaUpload />
              Choose Files
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Supported: Images, PDF, DOC, DOCX, TXT (Max 5 files, 10MB each)
            </p>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="font-medium">Selected Files:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded">
                  <span className="text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCreating}
          className="flex items-center gap-2 rounded-md bg-violet-900 px-6 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditing ? <FaEdit /> : <FaPlus />}
          {isCreating ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Assignment' : 'Create Assignment')}
        </button>
      </form>

      {error && <ErrorStrip error={error} />}
    </main>
  );
};

export default AssignmentForm;