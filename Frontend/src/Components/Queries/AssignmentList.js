import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import axios from "../../config/api/axios";
import { Link } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { FaPlus, FaTrash, FaEdit, FaEye, FaUpload } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";

const AssignmentList = () => {
  const { user } = useContext(UserContext);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState("");
  const [userPapers, setUserPapers] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

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

  const getAssignments = useCallback(async (silentRefresh = false) => {
    if (!selectedPaper) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    // Only show loading state if it's not a silent refresh
    if (!silentRefresh) {
      setLoading(true);
    }
    try {
      let url = `/assignments/${selectedPaper}`;
      
      // CRITICAL: For students, ALWAYS filter by their section
      if (user.userType === 'student' && user.section) {
        url += `?section=${user.section}`;
        console.log(`Student ${user.name} (${user.rollNo}) in section ${user.section} - fetching assignments from: ${url}`);
      }
      // For teachers, filter by section if selected
      else if (user.userType === 'staff' && user.role === 'teacher' && selectedSection) {
        url += `?section=${selectedSection}`;
        console.log(`Teacher filtering by section ${selectedSection} - fetching from: ${url}`);
      }
      else {
        console.log(`Fetching all assignments from: ${url}`);
      }
      
      // Add timeout for faster response feedback
      const response = await axios.get(url, { timeout: 10000 });
      const fetchedAssignments = response.data || [];
      
      // ADDITIONAL CLIENT-SIDE FILTERING FOR STUDENTS (Double security)
      let filteredAssignments = fetchedAssignments;
      if (user.userType === 'student' && user.section) {
        filteredAssignments = fetchedAssignments.filter(assignment => {
          // Only show assignments that are either:
          // 1. Specifically for the student's section
          // 2. Have no section specified (general assignments)
          return !assignment.section || assignment.section === user.section;
        });
        
        console.log(`Original assignments: ${fetchedAssignments.length}, Filtered for section ${user.section}: ${filteredAssignments.length}`);
        
        // Log any assignments that were filtered out for debugging
        const filteredOut = fetchedAssignments.filter(assignment => assignment.section && assignment.section !== user.section);
        if (filteredOut.length > 0) {
          console.warn(`Filtered out ${filteredOut.length} assignments not for section ${user.section}:`, 
            filteredOut.map(a => ({ title: a.title, section: a.section })));
        }
      }
      
      setAssignments(filteredAssignments);
      setError("");
    } catch (err) {
      console.error('Error fetching assignments:', err);
      if (err.code === 'ECONNABORTED') {
        setError("Request timeout - please try again");
      } else {
        setError("Error fetching assignments");
      }
      setAssignments([]);
    } finally {
      // Only hide loading state if it was shown
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  }, [selectedPaper, selectedSection, user]);

  // Fetch assignments when paper is selected
  useEffect(() => {
    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(getAssignments, 300);
    return () => clearTimeout(timeoutId);
  }, [getAssignments]);

  // Auto-refresh every 60 seconds (reduced frequency)
  useEffect(() => {
    if (!selectedPaper) return;
    
    const interval = setInterval(() => {
      // Silent refresh without showing loading state
      getAssignments(true); // Pass true for silent refresh
    }, 60000); // 60 seconds (1 minute)

    return () => clearInterval(interval);
  }, [getAssignments, selectedPaper]);

  const deleteAssignment = useCallback(async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      const response = await axios.delete(`/assignments/${assignmentId}`);
      toast.success(response.data.message);
      // Optimistically update UI
      setAssignments(prev => prev.filter(assignment => assignment._id !== assignmentId));
    } catch (err) {
      toast.error('Error deleting assignment');
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const isOverdue = useCallback((dueDate) => {
    return new Date(dueDate) < new Date();
  }, []);

  const isUpcoming = useCallback((dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due - now;
    return timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000; // Due within 24 hours
  }, []);

  // Memoize filtered assignments for better performance
  const filteredAssignments = useMemo(() => {
    if (!selectedSection) return assignments;
    return assignments.filter(assignment => assignment.section === selectedSection);
  }, [assignments, selectedSection]);

  // Get selected paper details
  const currentPaper = userPapers.find(p => p._id === selectedPaper);

  return (
    <main className="assignment-list">
      <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Assignments
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
                <strong>📍 Showing assignments for your section only:</strong> {user.section}
              </p>
              <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                You can only see assignments assigned to your section or general assignments.
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
              Showing assignments for Section: {selectedSection}
            </p>
          )}
        </div>
      )}

      {/* Add Assignment Button for Teachers and HODs */}
      {(user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')) && selectedPaper && (
        <div className="mb-4">
          <Link
            to="/dash/assignments/add-assignment"
            className="inline-flex items-center gap-2 rounded-md border border-violet-900 bg-slate-800 px-4 py-2 font-semibold text-slate-200 hover:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900"
          >
            <FaPlus />
            Create Assignment
          </Link>
        </div>
      )}

      <div className="mt-4">
        {!selectedPaper ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Please select a paper to view assignments</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <Loading />
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="space-y-4">
            {filteredAssignments.map((assignment, index) => (
              <div
                key={assignment._id}
                className={`rounded-lg border p-4 ${
                  isOverdue(assignment.dueDate)
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : isUpcoming(assignment.dueDate)
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{assignment.title}</h3>
                      {assignment.section && (
                        <span className="rounded bg-violet-600 px-2 py-1 text-xs text-white">
                          {assignment.section}
                        </span>
                      )}
                      {isOverdue(assignment.dueDate) && (
                        <span className="rounded bg-red-600 px-2 py-1 text-xs text-white">
                          Overdue
                        </span>
                      )}
                      {isUpcoming(assignment.dueDate) && (
                        <span className="rounded bg-yellow-600 px-2 py-1 text-xs text-white">
                          Due Soon
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{assignment.description}</p>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <p><strong>Due:</strong> {formatDate(assignment.dueDate)}</p>
                      <p><strong>Max Marks:</strong> {assignment.maxMarks}</p>
                      <p><strong>Submissions:</strong> {assignment.submissions?.length || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD') && (
                      <>
                        <Link
                          to={`/dash/assignments/${assignment._id}/edit`}
                          className="rounded p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit Assignment"
                        >
                          <FaEdit />
                        </Link>
                        <Link
                          to={`/dash/assignments/${assignment._id}/submissions`}
                          className="rounded p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20"
                          title="View Submissions"
                        >
                          <FaEye />
                        </Link>
                        <button
                          onClick={() => deleteAssignment(assignment._id)}
                          className="rounded p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Delete Assignment"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                    {user.userType === 'student' && (
                      <Link
                        to={`/dash/assignments/${assignment._id}/submit`}
                        className="rounded bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700 flex items-center gap-1"
                      >
                        <FaUpload />
                        Submit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {error ? "Error fetching assignments" : "No assignments found for this paper"}
            </p>
            {!error && user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD') && (
              <p className="text-sm text-gray-400">
                Create your first assignment using the "Create Assignment" button above.
              </p>
            )}
          </div>
        )}
      </div>

      {error ? <ErrorStrip error={error} /> : ""}
    </main>
  );
};

export default AssignmentList;