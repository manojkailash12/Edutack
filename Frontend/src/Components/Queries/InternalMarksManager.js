import { useState, useEffect, useContext, useCallback } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { FaSave, FaFileExcel, FaPlus, FaTrash, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";

// Utility function to sort students by roll number
function sortByRollNumber(students) {
  return students.sort((a, b) => {
    const rollA = a.rollNo || "";
    const rollB = b.rollNo || "";
    
    // Extract numeric part from roll number for proper sorting
    const numA = parseInt(rollA.replace(/\D/g, '')) || 0;
    const numB = parseInt(rollB.replace(/\D/g, '')) || 0;
    
    return numA - numB;
  });
}

// Subject abbreviation to full name mapping
const subjectMapping = {
  'DL': 'Deep Learning',
  'BDA': 'Big Data Analytics',
  'SQT': 'Software Quality Testing',
  'MAP': 'Mobile Application Programming',
  'CRT': 'CRT',
  'SIE': 'System Integration and Engineering',
  'DSA': 'Data Structures and Algorithms',
  'OOP': 'Object Oriented Programming',
  'DBMS': 'Database Management Systems',
  'CN': 'Computer Networks',
  'OS': 'Operating Systems',
  'SE': 'Software Engineering',
  'AI': 'Artificial Intelligence',
  'ML': 'Machine Learning',
  'CC': 'Cloud Computing',
  'IOT': 'Internet of Things',
  'CS': 'Cyber Security',
  'BC': 'Blockchain'
};

// Utility function to get full subject name from paper name
function getFullSubjectName(paperName) {
  if (!paperName) return '';
  
  // Extract the subject abbreviation from paper name (e.g., "DL - ALPHA - Sem VII" -> "DL")
  const parts = paperName.split(' - ');
  const abbreviation = parts[0];
  
  // Return full name if mapping exists, otherwise return the original abbreviation
  return subjectMapping[abbreviation] || abbreviation;
}

// Utility function to calculate grade based on total marks (60-point system)
function calculateGrade(totalMarks) {
  const marks = totalMarks || 0;
  if (marks >= 55) return "A+";
  else if (marks >= 50) return "A";
  else if (marks >= 45) return "B+";
  else if (marks >= 40) return "B";
  else if (marks >= 36) return "C";
  else return "F";
}

// Utility function to get grade color
function getGradeColor(grade) {
  switch(grade) {
    case "A+": return "text-green-600 dark:text-green-400";
    case "A": return "text-blue-600 dark:text-blue-400";
    case "B+": return "text-purple-600 dark:text-purple-400";
    case "B": return "text-indigo-600 dark:text-indigo-400";
    case "C": return "text-orange-600 dark:text-orange-400";
    case "F": return "text-red-600 dark:text-red-400";
    default: return "text-gray-600 dark:text-gray-400";
  }
}

const defaultRow = {
  rollNo: "",
  name: "",
  subject: "",
  midMarks: 0,
  lab: 0,
  assignmentQuiz: 0,
  assignmentQuizAuto: false,
  assignmentQuizManual: false,
  attendance: 0,
  total: 0
};

const InternalMarksManager = () => {
  const { user } = useContext(UserContext);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedSection, setSelectedSection] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [studentViewRow, setStudentViewRow] = useState(null);
  const [teacherPapers, setTeacherPapers] = useState([]);

  // Fetch papers based on user role
  // NOTE: For Internal Marks Manager, even HODs only see papers they personally teach
  // For department-wide view, HODs should use the HOD Dashboard
  useEffect(() => {
    const fetchPapers = async () => {
      console.log("=== FETCHING PAPERS DEBUG ===");
      console.log("User object:", user);
      console.log("User ID:", user._id);
      console.log("User role:", user.role);
      console.log("User userType:", user.userType);
      console.log("User department:", user.department);
      
      if (!user._id) {
        console.log("No user ID, skipping paper fetch");
        return;
      }
      
      try {
        let response;
        let endpoint;
        
        if (user.role === 'teacher' || user.role === 'HOD') {
          // For both teachers and HODs, get only papers they personally teach
          // HODs use HOD Dashboard for department-wide internal marks view
          endpoint = `/paper/staff/${user._id}`;
          console.log("Fetching personal teaching papers from:", endpoint);
          response = await axios.get(endpoint);
        } else if (user.userType === 'student') {
          // For students, get papers they are enrolled in
          endpoint = `/paper/student/${user._id}`;
          console.log("Fetching student papers from:", endpoint);
          response = await axios.get(endpoint);
        } else {
          console.log("User role not recognized for paper fetching");
          setTeacherPapers([]);
          return;
        }
        
        console.log("Papers API response:", response?.data);
        if (response?.data) {
          setTeacherPapers(response.data);
          console.log("Papers set successfully:", response.data.length, "papers");
        } else {
          console.log("No papers data in response");
          setTeacherPapers([]);
        }
      } catch (err) {
        console.error('Error fetching papers:', err);
        console.error('Error details:', err.response?.data || err.message);
        setTeacherPapers([]);
      }
    };

    fetchPapers();
  }, [user]);

  // Update selectedPaper when selectedPaperId changes
  useEffect(() => {
    console.log("=== PAPER SELECTION DEBUG ===");
    console.log("Selected Paper ID:", selectedPaperId);
    console.log("Available Papers:", teacherPapers);
    
    if (!selectedPaperId) {
      console.log("No paper selected, clearing data");
      setSelectedPaper(null);
      setRows([]);
      setSelectedSection("");
      return;
    }
    
    // Use teacherPapers for all roles (it contains the appropriate papers based on user role)
    const papers = teacherPapers;
    const found = papers.find(p => p._id === selectedPaperId);
    console.log("Found paper:", found);
    setSelectedPaper(found || null);
    setSelectedSection("");
  }, [selectedPaperId, teacherPapers]);

  // For staff/HOD/teacher: auto-fetch students and load marks data
  const isStaffOrTeacher = user.userType === "staff" || user.role === "teacher" || user.role === "HOD";
  
  const fetchMarksData = useCallback(async () => {
    console.log("=== INTERNAL MARKS DEBUG ===");
    console.log("Selected Paper:", selectedPaper);
    console.log("Selected Section:", selectedSection);
    console.log("User:", user);
    console.log("Is Staff/Teacher:", isStaffOrTeacher);
    
    if (!selectedPaper || !selectedPaper._id || !isStaffOrTeacher) {
      console.log("Early return - missing data");
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      let allStudents = [];
      console.log("Starting to fetch students...");
      
      // Always use department-based approach for more reliable results
      console.log(`Fetching students using department approach`);
      console.log(`Department: ${selectedPaper.department}, Year: ${selectedPaper.year}`);
      
      try {
        // Get all students from department
        const endpoint = `/student/list/${encodeURIComponent(selectedPaper.department)}`;
        console.log(`Making request to: ${endpoint}`);
        const departmentStudentsResponse = await axios.get(endpoint);
        const departmentStudents = departmentStudentsResponse.data || [];
        console.log(`Department endpoint returned ${departmentStudents.length} students:`, departmentStudents);
        
        if (selectedSection) {
          // Filter for specific section
          allStudents = departmentStudents.filter(student => 
            student.section === selectedSection && 
            student.year === selectedPaper.year
          );
          console.log(`After filtering by section ${selectedSection} and year ${selectedPaper.year}: ${allStudents.length} students`);
        } else {
          // Filter for all sections that this paper covers
          const sections = selectedPaper.sections || [];
          console.log(`Filtering for sections: ${sections.join(', ')}`);
          
          allStudents = departmentStudents.filter(student => 
            sections.includes(student.section) && 
            student.year === selectedPaper.year
          );
          console.log(`After filtering by sections ${sections.join(', ')} and year ${selectedPaper.year}: ${allStudents.length} students`);
          
          // Add section info to each student
          allStudents = allStudents.map(s => ({ ...s, currentSection: s.section }));
        }
      } catch (err) {
        console.error('Error fetching students from department:', err);
        allStudents = [];
      }
      
      console.log(`Total students found: ${allStudents.length}`);
      const sortedStudents = sortByRollNumber(allStudents);
      console.log(`After sorting: ${sortedStudents.length} students`);
      
      // Get existing marks
      console.log(`Fetching existing marks for paper: ${selectedPaper._id}`);
      const marksResponse = await axios.get(`/internal/paper/${selectedPaper._id}/manual`);
      const existingMarks = marksResponse.data || [];
      console.log(`Found ${existingMarks.length} existing marks`);
      
      // Get assignment and quiz marks for this paper
      console.log(`Fetching assignment and quiz marks for paper: ${selectedPaper._id}`);
      let assignmentMarks = {};
      let quizMarks = {};
      
      try {
        const assignmentResponse = await axios.get(`/assignments/marks/${selectedPaper._id}`);
        assignmentMarks = assignmentResponse.data || {};
        console.log(`Found assignment marks for ${Object.keys(assignmentMarks).length} students`);
      } catch (err) {
        console.log('No assignment marks found or error fetching:', err.response?.data?.message || err.message);
        assignmentMarks = {};
      }
      
      try {
        const quizResponse = await axios.get(`/quizzes/marks/${selectedPaper._id}`);
        quizMarks = quizResponse.data || {};
        console.log(`Found quiz marks for ${Object.keys(quizMarks).length} students`);
      } catch (err) {
        console.log('No quiz marks found or error fetching:', err.response?.data?.message || err.message);
        quizMarks = {};
      }
      
      // Merge students with existing marks, assignment marks, and quiz marks
      const mergedRows = sortedStudents.map(student => {
        const existingMark = existingMarks.find(mark => mark._id === student._id || mark.rollNo === student.rollNo);
        const studentAssignmentMarks = assignmentMarks[student._id] || 0;
        const studentQuizMarks = quizMarks[student._id] || 0;
        
        // Combine assignment and quiz marks (average or sum based on preference)
        const combinedAssignmentQuizMarks = Math.round((studentAssignmentMarks + studentQuizMarks) / 2);
        
        if (existingMark) {
          // Update existing mark's subject to use full name
          existingMark.subject = getFullSubjectName(selectedPaper.paper);
          
          // Only update assignment/quiz marks if not manually overridden
          if (!existingMark.assignmentQuizManual && combinedAssignmentQuizMarks > 0) {
            existingMark.assignmentQuiz = combinedAssignmentQuizMarks;
            existingMark.assignmentQuizAuto = true;
          }
          
          // Recalculate total
          existingMark.total = (existingMark.midMarks || 0) + (existingMark.lab || 0) + 
                              (existingMark.assignmentQuiz || 0) + (existingMark.attendance || 0);
          return existingMark;
        } else {
          return {
            _id: student._id,
            rollNo: student.rollNo,
            name: student.name,
            subject: getFullSubjectName(selectedPaper.paper),
            midMarks: 0,
            lab: 0,
            assignmentQuiz: combinedAssignmentQuizMarks,
            assignmentQuizAuto: combinedAssignmentQuizMarks > 0, // Mark as auto-populated if we have marks
            assignmentQuizManual: false,
            attendance: 0,
            total: combinedAssignmentQuizMarks
          };
        }
      });
      
      console.log(`Final merged rows: ${mergedRows.length}`);
      console.log("Merged rows data:", mergedRows);
      setRows(mergedRows);
    } catch (err) {
      console.error('Error fetching marks data:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPaper, isStaffOrTeacher, selectedSection, user]);

  useEffect(() => {
    fetchMarksData();
  }, [fetchMarksData]);

  // Auto-refresh removed - manual refresh only
        
  // Add a new empty row
  const addRow = () => {
    setRows([...rows, { 
      ...defaultRow, 
      subject: selectedPaper ? getFullSubjectName(selectedPaper.paper) : "",
      assignmentQuizAuto: false,
      assignmentQuizManual: false
    }]);
  };

  // Delete a row
  const deleteRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Handle cell change with validation
  const handleCellChange = (idx, field, value) => {
    const updatedRows = [...rows];
    
    if (field === "rollNo" || field === "name" || field === "subject") {
      updatedRows[idx][field] = value;
    } else {
      let numValue = parseInt(value) || 0;
      
      // Apply max limits based on 60-point system
      if (field === 'midMarks' && numValue > 30) {
        numValue = 30;
        toast.warning("Mid marks cannot exceed 30");
      } else if ((field === 'lab' || field === 'assignmentQuiz' || field === 'attendance') && numValue > 10) {
        numValue = 10;
        toast.warning(`${field === 'lab' ? 'Lab' : field === 'assignmentQuiz' ? 'Assignment/Quiz' : 'Attendance'} marks cannot exceed 10`);
      }
      
      // Prevent negative values
      if (numValue < 0) {
        numValue = 0;
        toast.warning("Marks cannot be negative");
      }
      
      updatedRows[idx][field] = numValue;
    }
    
    // Track manual changes to assignment/quiz marks
    if (field === 'assignmentQuiz') {
      updatedRows[idx].assignmentQuizManual = true;
      updatedRows[idx].assignmentQuizAuto = false;
    }
    
    // Auto-calculate total
    const total = (parseInt(updatedRows[idx].midMarks) || 0) +
                  (parseInt(updatedRows[idx].lab) || 0) +
                  (parseInt(updatedRows[idx].assignmentQuiz) || 0) +
                  (parseInt(updatedRows[idx].attendance) || 0);
    
    // Ensure total doesn't exceed 60
    updatedRows[idx].total = Math.min(total, 60);
    
    if (total > 60) {
      toast.warning("Total marks cannot exceed 60. Please adjust individual components.");
    }
    
    setRows(updatedRows);
  };

  // Save all rows
  const saveMarks = async () => {
    if (rows.length === 0) {
      toast.error("No marks to save");
      return;
    }
    
    setSaving(true);
    try {
      // Sort rows by roll number before saving
      const sortedRows = sortByRollNumber([...rows]);
      await axios.post(`/internal/paper/${selectedPaper._id}/manual`, { marks: sortedRows });
      toast.success("Marks saved successfully!");
      setRows(sortedRows); // Update state with sorted data
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Save error:", err);
      if (err.response?.data?.errors) {
        // Show validation errors from backend
        const errorMessages = err.response.data.errors.join(", ");
        toast.error(`Validation errors: ${errorMessages}`);
        setError(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(err.response?.data?.message || "Error saving marks");
        setError(err.response?.data?.message || "Error saving marks");
      }
    } finally {
      setSaving(false);
    }
  };

  // Download as Excel
  const downloadMarksSheet = async () => {
    try {
      const response = await axios.get(`/internal/paper/${selectedPaper._id}/manual/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Internal_Marks_${getFullSubjectName(selectedPaper.paper)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Error downloading marks sheet');
    }
  };

  // Download Class PDF Report
  const downloadClassPDF = async () => {
    if (!selectedPaper?._id) {
      toast.error('Please select a paper first');
      return;
    }

    try {
      const response = await axios.get(`/internal/paper/${selectedPaper._id}/pdf`, {
        params: selectedSection ? { section: selectedSection } : {},
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Internal_Marks_Report_${getFullSubjectName(selectedPaper.paper)}_${selectedSection || 'All'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Class PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error downloading PDF: ' + (error.response?.data?.message || error.message));
    }
  };



  // Download All Papers PDF Report (for students)
  const downloadStudentAllPapersPDF = async () => {
    try {
      let endpoint, filename, params = {};
      
      if (selectedPaperId === 'all') {
        endpoint = `/internal/student/${user._id}/pdf/all`;
        filename = `All_Papers_Report_${user.rollNo || user.name}.pdf`;
      } else if (selectedPaperId) {
        // For specific paper, pass the paper ID as parameter
        endpoint = `/internal/student/${user._id}/pdf`;
        params = { paperId: selectedPaperId };
        const paperName = teacherPapers.find(p => p._id === selectedPaperId)?.paper || 'Subject';
        filename = `${paperName}_Report_${user.rollNo || user.name}.pdf`;
      } else {
        // No paper selected, get all papers
        endpoint = `/internal/student/${user._id}/pdf`;
        filename = `Student_Report_${user.rollNo || user.name}.pdf`;
      }

      const response = await axios.get(endpoint, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${selectedPaperId === 'all' ? 'All Papers' : 'Student'} PDF report downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading student PDF:', error);
      toast.error('Error downloading student PDF: ' + (error.response?.data?.message || error.message));
    }
  };



  // Function to load assignment and quiz marks without full page refresh
  const loadAssignmentMarks = async () => {
    if (!selectedPaper?._id) return;
    
    setLoadingMarks(true);
    try {
      console.log(`Loading assignment and quiz marks for paper: ${selectedPaper._id}`);
      
      // Fetch both assignment and quiz marks
      const [assignmentResponse, quizResponse] = await Promise.all([
        axios.get(`/assignments/marks/${selectedPaper._id}`).catch(() => ({ data: {} })),
        axios.get(`/quizzes/marks/${selectedPaper._id}`).catch(() => ({ data: {} }))
      ]);
      
      const assignmentMarks = assignmentResponse.data || {};
      const quizMarks = quizResponse.data || {};
      
      console.log(`Loaded assignment marks for ${Object.keys(assignmentMarks).length} students`);
      console.log(`Loaded quiz marks for ${Object.keys(quizMarks).length} students`);
      
      // Update existing rows with new marks
      const updatedRows = rows.map(row => {
        const studentAssignmentMarks = assignmentMarks[row._id] || 0;
        const studentQuizMarks = quizMarks[row._id] || 0;
        const combinedMarks = Math.round((studentAssignmentMarks + studentQuizMarks) / 2);
        
        if (combinedMarks > 0 && !row.assignmentQuizManual) {
          return {
            ...row,
            assignmentQuiz: combinedMarks,
            assignmentQuizAuto: true,
            assignmentQuizManual: false,
            total: (row.midMarks || 0) + (row.lab || 0) + combinedMarks + (row.attendance || 0)
          };
        }
        return row;
      });
      
      setRows(updatedRows);
      const totalStudentsUpdated = Object.keys({...assignmentMarks, ...quizMarks}).length;
      toast.success(`Loaded assignment and quiz marks for ${totalStudentsUpdated} students`);
    } catch (err) {
      console.error('Error loading marks:', err);
      toast.error('Failed to load assignment and quiz marks');
    } finally {
      setLoadingMarks(false);
    }
  };

  // Student view: automatically load their own marks (NO SEARCH ALLOWED)
  useEffect(() => {
    if (user.userType === "student" && selectedPaper && user.rollNo) {
      // Automatically fetch ONLY the logged-in student's marks
      axios.get(`/internal/paper/${selectedPaper._id}/manual`)
        .then(res => {
          const data = res.data || [];
          const sortedData = sortByRollNumber(data);
          // SECURITY: Only show marks for the logged-in student's roll number
          const found = sortedData.find(row => row.rollNo === user.rollNo);
          setStudentViewRow(found || null);
        })
        .catch(() => setStudentViewRow(null));
    } else if (user.userType === "student") {
      setStudentViewRow(null);
    }
  }, [selectedPaper, user.userType, user.rollNo]);



  if (loading) return <Loading />;

  console.log('=== USER TYPE DEBUG ===');
  console.log('user.userType:', user.userType);
  console.log('user.role:', user.role);
  console.log('Full user object:', user);

  // Student view: display ONLY their own marks (SECURE)
  if (user.userType === 'student' || user.role === 'student') {
    return (
      <main className="internal-marks-student-view">
        <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
          My Internal Marks
        </h2>
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 mb-2">
            <strong>Student:</strong> {user.name} | <strong>Roll No:</strong> {user.rollNo} | <strong>Section:</strong> {user.section}
          </p>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <strong>60-Point System:</strong> Mid (30) + Lab (10) + Assignment/Quiz (10) + Attendance (10) = Total (60) | 
            <strong> Grades:</strong> A+ (55-60), A (50-54), B+ (45-49), B (40-44), C (36-39), F (&lt;36)
          </div>
        </div>
        <div className="mb-4 flex gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <select
              className="border rounded px-2 py-1"
              value={selectedPaperId}
              onChange={e => setSelectedPaperId(e.target.value)}
            >
              <option value="">Select Paper</option>
              <option value="all">All Papers (Combined Report)</option>
              {teacherPapers.map(p => (
                <option key={p._id} value={p._id}>{getFullSubjectName(p.paper)}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              (Showing marks for your roll number only)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadStudentAllPapersPDF()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              title="Download complete report with all your subjects"
            >
              <FaDownload />
              {selectedPaperId === 'all' ? 'Download All Papers PDF' : 'Download My Complete Report PDF'}
            </button>
          </div>
        </div>
        {studentViewRow ? (
          <table className="w-full border-collapse border border-slate-400">
            <thead>
              <tr className="bg-violet-200 dark:bg-slate-700">
                <th className="border border-slate-400 px-4 py-2 text-left">Roll No</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Name</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Subject</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Mid Marks (30)</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Lab (10)</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Assignment/Quiz (10)</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Attendance (10)</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Total (60)</th>
                <th className="border border-slate-400 px-4 py-2 text-left">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.rollNo}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.name}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.subject}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.midMarks}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.lab}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.assignmentQuiz}</td>
                <td className="border border-slate-400 px-4 py-2">{studentViewRow.attendance}</td>
                <td className="border border-slate-400 px-4 py-2 font-bold text-violet-600 dark:text-violet-400">{studentViewRow.total}</td>
                <td className="border border-slate-400 px-4 py-2 font-bold">
                  <span className={getGradeColor(calculateGrade(studentViewRow.total))}>{calculateGrade(studentViewRow.total)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        ) : selectedPaperId === 'all' ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
            <div className="mb-4">
              <FaDownload className="mx-auto text-4xl text-blue-600 dark:text-blue-400 mb-2" />
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
                All Papers Report
              </h3>
              <p className="text-blue-600 dark:text-blue-300 mb-4">
                Download a comprehensive report containing all your subject marks in one PDF document.
              </p>
              <button
                onClick={() => downloadStudentAllPapersPDF()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mx-auto"
              >
                <FaDownload />
                Download All Papers Report
              </button>
            </div>
          </div>
        ) : selectedPaper ? (
          <div className="text-lg text-gray-600 dark:text-gray-400">
            No marks available for {user.rollNo} in {getFullSubjectName(selectedPaper.paper)} yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Please select a paper to view your marks, or download your complete report using the button above.
            </div>
            {teacherPapers.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> No papers found in your enrollment. You can still download your complete internal marks report using the "Download All Papers PDF" button above, which will include all subjects where you have marks.
                </p>
              </div>
            )}
          </div>
        )}
        {error ? <ErrorStrip error={error} /> : ""}
      </main>
    );
  }

  // Get available sections for selected paper
  const getAvailableSections = () => {
    if (!selectedPaper) return [];
    return selectedPaper.sections || [];
  };

  // Staff/HOD/teacher view: simple marks management like the screenshot
  return (
    <main className="internal-marks-manager">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Internal Marks Management
      </h2>
      {user.role === 'HOD' && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
          Managing marks for papers you personally teach. For department-wide internal marks view, use the HOD Dashboard.
        </p>
      )}
      


      {/* Grading Scale Information Panel */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Grade Scale</h3>
        <div className="text-sm">
          <ul className="text-blue-600 dark:text-blue-400 space-y-1">
            <li>• <span className="text-green-600 dark:text-green-400 font-bold">A+</span>: 55-60 marks</li>
            <li>• <span className="text-blue-600 dark:text-blue-400 font-bold">A</span>: 50-54 marks</li>
            <li>• <span className="text-purple-600 dark:text-purple-400 font-bold">B+</span>: 45-49 marks</li>
            <li>• <span className="text-indigo-600 dark:text-indigo-400 font-bold">B</span>: 40-44 marks</li>
            <li>• <span className="text-orange-600 dark:text-orange-400 font-bold">C</span>: 36-39 marks</li>
            <li>• <span className="text-red-600 dark:text-red-400 font-bold">F</span>: Below 36 marks</li>
          </ul>
        </div>
      </div>

      {/* Simple Controls - just paper and section selection */}
      <div className="mb-4 flex gap-2 items-center">
        <select
          className="border rounded px-2 py-1"
          value={selectedPaperId}
          onChange={e => setSelectedPaperId(e.target.value)}
        >
          <option value="">Select Paper</option>
          {teacherPapers.map(p => (
            <option key={p._id} value={p._id}>{getFullSubjectName(p.paper)}</option>
          ))}
        </select>
        
        {selectedPaper && (
          <select
            className="border rounded px-2 py-1"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {getAvailableSections().map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        )}
      </div>
      {!selectedPaper ? (
        <div className="mb-4">
          <p className="text-2xl font-bold mb-2">Please select a paper to begin.</p>
          {user.role === 'HOD' && teacherPapers.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> No papers are assigned to you for teaching. 
                As an HOD, you can view department-wide internal marks in the <strong>HOD Dashboard</strong>.
                This page only shows papers you personally teach.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Action Buttons Row - exactly like the screenshot */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg">
              Total Students: {rows.length}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={addRow} 
                disabled={!selectedPaper._id} 
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FaPlus /> Add Row
              </button>
              <button 
                onClick={loadAssignmentMarks} 
                disabled={!selectedPaper._id || loadingMarks} 
                className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
                title="Load latest quiz and assignment marks from submissions"
              >
                {loadingMarks ? '⏳ Loading...' : '📝 Load Quiz/Assignment Marks'}
              </button>
              <button 
                onClick={downloadMarksSheet} 
                disabled={!selectedPaper._id} 
                className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <FaFileExcel /> Download Excel
              </button>
              <button 
                onClick={downloadClassPDF} 
                disabled={!selectedPaper._id} 
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FaDownload /> Class PDF Report
              </button>
              <button 
                onClick={saveMarks} 
                disabled={saving || !selectedPaper._id} 
                className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <FaSave /> {saving ? 'Saving...' : 'Save All Marks'}
              </button>
            </div>
          </div>
          {/* Marks Table - exactly like the screenshot */}
          <div id="marks-table" className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-violet-200 dark:bg-slate-700">
                  <th className="border border-slate-400 px-4 py-2 text-left">S.No</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Roll No</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Name</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Subject</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Mid Marks (30)</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Lab (10)</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Assignment/Quiz (10)</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Attendance (10)</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Total (60)</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Grade</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-violet-50 dark:hover:bg-slate-700">
                    <td className="border border-slate-400 px-4 py-2">{idx + 1}</td>
                    <td className="border border-slate-400 px-4 py-2 font-medium">
                      <input type="text" value={row.rollNo} onChange={e => handleCellChange(idx, 'rollNo', e.target.value)} className="w-24 rounded border border-slate-400 px-2 py-1" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <input type="text" value={row.name} onChange={e => handleCellChange(idx, 'name', e.target.value)} className="w-32 rounded border border-slate-400 px-2 py-1" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <input type="text" value={row.subject} readOnly title="Subject is auto-filled based on selected paper" className="w-32 rounded border border-slate-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 cursor-not-allowed" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <input type="number" min="0" max="30" value={row.midMarks} onChange={e => handleCellChange(idx, 'midMarks', e.target.value)} className="w-16 rounded border border-slate-400 px-2 py-1 text-center" title="Max: 30 marks" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <input type="number" min="0" max="10" value={row.lab} onChange={e => handleCellChange(idx, 'lab', e.target.value)} className="w-16 rounded border border-slate-400 px-2 py-1 text-center" title="Max: 10 marks" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2 relative">
                      <input 
                        type="number" 
                        min="0" 
                        max="10" 
                        value={row.assignmentQuiz} 
                        onChange={e => handleCellChange(idx, 'assignmentQuiz', e.target.value)}
                        title={`Max: 10 marks. ${row.assignmentQuizAuto ? "Auto-populated from assignments. You can manually override." : "Manual entry"}`} 
                        className={`w-16 rounded border px-2 py-1 text-center ${
                          row.assignmentQuizAuto 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600' 
                            : row.assignmentQuizManual 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600'
                            : 'bg-white dark:bg-slate-800 border-slate-400'
                        }`}
                        placeholder="0"
                      />
                      {row.assignmentQuizAuto && (
                        <span className="absolute -top-1 -right-1 text-xs text-green-600 dark:text-green-400" title="Auto-populated">🤖</span>
                      )}
                      {row.assignmentQuizManual && (
                        <span className="absolute -top-1 -right-1 text-xs text-orange-600 dark:text-orange-400" title="Manually edited">✏️</span>
                      )}
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <input type="number" min="0" max="10" value={row.attendance} onChange={e => handleCellChange(idx, 'attendance', e.target.value)} className="w-16 rounded border border-slate-400 px-2 py-1 text-center" title="Max: 10 marks" />
                    </td>
                    <td className="border border-slate-400 px-4 py-2 font-bold">
                      <span className="text-violet-600 dark:text-violet-400">{row.total}</span>
                    </td>
                    <td className="border border-slate-400 px-4 py-2 font-bold">
                      <span className={getGradeColor(calculateGrade(row.total))}>{calculateGrade(row.total)}</span>
                    </td>
                    <td className="border border-slate-400 px-4 py-2">
                      <button onClick={() => deleteRow(idx)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" title="Delete Row">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={11} className="text-center text-gray-500 py-8">
                      No marks entered yet. Click "Add Row" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error && <ErrorStrip error={error} />}
        </>
      )}
    </main>
  );
};

export default InternalMarksManager; 