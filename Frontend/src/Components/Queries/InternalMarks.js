import React, { useState, useContext, useEffect } from 'react';
import axios from '../../config/api/axios';
import UserContext from '../../Hooks/UserContext';
import { FaDownload, FaEdit, FaSave, FaPlus, FaTrash, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { TableHeader } from '../Table';

const InternalMarks = () => {
  const { user, paperList } = useContext(UserContext);
  const [selectedPaper, setSelectedPaper] = useState('');
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNo: '',
    name: '',
    midMarks: 0,
    lab: 0,
    assignmentQuiz: 0,
    attendance: 0,
    total: 0
  });

  // Fetch marks for selected paper with cache busting
  const fetchMarks = async (forceRefresh = false) => {
    if (!selectedPaper) return;
    
    setLoading(true);
    try {
      // Add cache busting parameter to force fresh data
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
      const response = await axios.get(`/internal/paper/${selectedPaper}/manual${cacheBuster}`);
      setMarks(response.data || []);
      
      if (forceRefresh) {
        toast.success('Marks refreshed successfully!');
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
      setMarks([]);
      if (forceRefresh) {
        toast.error('Failed to refresh marks');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarks(false);
  }, [selectedPaper]);

  // Auto-refresh for students every 30 seconds to get latest marks
  useEffect(() => {
    if (user.userType === 'student' && selectedPaper && selectedPaper !== 'all') {
      const interval = setInterval(() => {
        fetchMarks(false);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [selectedPaper, user.userType]);

  // Calculate total marks
  const calculateTotal = (midMarks, lab, assignmentQuiz, attendance) => {
    return (parseInt(midMarks) || 0) + (parseInt(lab) || 0) + (parseInt(assignmentQuiz) || 0) + (parseInt(attendance) || 0);
  };

  // Handle mark changes
  const handleMarkChange = (index, field, value) => {
    const updatedMarks = [...marks];
    updatedMarks[index][field] = parseInt(value) || 0;
    
    // Auto-calculate total
    if (['midMarks', 'lab', 'assignmentQuiz', 'attendance'].includes(field)) {
      updatedMarks[index].total = calculateTotal(
        updatedMarks[index].midMarks,
        updatedMarks[index].lab,
        updatedMarks[index].assignmentQuiz,
        updatedMarks[index].attendance
      );
    }
    
    setMarks(updatedMarks);
  };

  // Add new student
  const addNewStudent = () => {
    if (!newStudent.rollNo || !newStudent.name) {
      toast.error('Please enter roll number and name');
      return;
    }
    
    const total = calculateTotal(newStudent.midMarks, newStudent.lab, newStudent.assignmentQuiz, newStudent.attendance);
    const studentWithTotal = { ...newStudent, total };
    
    setMarks([...marks, studentWithTotal]);
    setNewStudent({
      rollNo: '',
      name: '',
      midMarks: 0,
      lab: 0,
      assignmentQuiz: 0,
      attendance: 0,
      total: 0
    });
  };

  // Remove student
  const removeStudent = (index) => {
    const updatedMarks = marks.filter((_, i) => i !== index);
    setMarks(updatedMarks);
  };

  // Save marks
  const saveMarks = async () => {
    if (!selectedPaper) {
      toast.error('Please select a paper first');
      return;
    }

    try {
      await axios.post(`/internal/paper/${selectedPaper}/manual`, { marks });
      toast.success('Marks saved successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Error saving marks:', error);
      toast.error('Error saving marks: ' + (error.response?.data?.message || error.message));
    }
  };

  // Download PDF - Class Report
  const downloadClassPDF = async () => {
    if (!selectedPaper) {
      toast.error('Please select a paper first');
      return;
    }

    try {
      const response = await axios.get(`/internal/paper/${selectedPaper}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Internal_Marks_Report_${selectedPaper}.pdf`);
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

  // Download Student PDF (Single Paper or All Papers)
  const downloadStudentPDF = async () => {
    if (user.userType !== 'student') {
      toast.error('Student PDF is only available for students');
      return;
    }

    try {
      let endpoint;
      let filename;
      
      if (selectedPaper === 'all') {
        endpoint = `/internal/student/${user._id}/pdf/all`;
        filename = `Student_All_Papers_Report_${user.rollNo || user.name}.pdf`;
      } else {
        endpoint = `/internal/student/${user._id}/pdf`;
        filename = `Student_Report_${user.rollNo || user.name}.pdf`;
      }

      const response = await axios.get(endpoint, {
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
      
      toast.success(`${selectedPaper === 'all' ? 'All Papers' : 'Student'} PDF report downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading student PDF:', error);
      toast.error('Error downloading student PDF: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get grade based on total marks (60-point system)
  const getGrade = (total) => {
    if (total >= 55) return { grade: 'A+', color: 'text-green-600' };
    if (total >= 50) return { grade: 'A', color: 'text-blue-600' };
    if (total >= 45) return { grade: 'B+', color: 'text-purple-600' };
    if (total >= 40) return { grade: 'B', color: 'text-indigo-600' };
    if (total >= 36) return { grade: 'C', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  // Calculate statistics
  const stats = {
    totalStudents: marks.length,
    averageMarks: marks.length > 0 ? (marks.reduce((sum, mark) => sum + mark.total, 0) / marks.length).toFixed(1) : 0,
    passedStudents: marks.filter(mark => mark.total >= 36).length,
    failedStudents: marks.filter(mark => mark.total < 36).length
  };

  return (
    <main className="internal-marks">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Internal Marks Management
      </h2>
      
      <div className="mb-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-1">Select Paper</label>
              <select
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value)}
                className="w-64 p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
              >
                <option value="">Select Paper</option>
                <option value="all">All Papers (Combined Report)</option>
                {paperList.map((paper) => (
                  <option key={paper._id} value={paper._id}>
                    {paper.paper} - {paper.department}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            {user.userType === 'student' && (
              <>
                {selectedPaper && selectedPaper !== 'all' && (
                  <button
                    onClick={() => fetchMarks(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    title="Refresh to get latest marks"
                  >
                    <span>🔄</span>
                    <span>Refresh</span>
                  </button>
                )}
                <button
                  onClick={downloadStudentPDF}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  <FaDownload />
                  {selectedPaper === 'all' ? 'All Papers PDF' : 'My Report PDF'}
                </button>
              </>
            )}
            
            {user.userType === 'staff' && selectedPaper && selectedPaper !== 'all' && (
              <>
                <button
                  onClick={downloadClassPDF}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  <FaDownload />
                  Class PDF
                </button>
                
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    <FaEdit />
                    Edit Marks
                  </button>
                ) : (
                  <button
                    onClick={saveMarks}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    <FaSave />
                    Save Marks
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selectedPaper && selectedPaper !== 'all' && (
        <>
          {/* Statistics */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Total Students</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudents}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Average Marks</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.averageMarks}/60</p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Passed</h3>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.passedStudents}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Failed</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failedStudents}</p>
            </div>
          </div>

          {/* Marks Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <TableHeader
                  Headers={[
                    "S.No",
                    "Roll No",
                    "Name", 
                    "Mid Marks (30)",
                    "Lab (10)",
                    "Assignment/Quiz (10)",
                    "Attendance (10)",
                    "Total (60)",
                    "Grade",
                    ...(editMode && user.userType === 'staff' ? ["Actions"] : [])
                  ]}
                />
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8">Loading...</td>
                    </tr>
                  ) : marks.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8">No marks found</td>
                    </tr>
                  ) : (
                    marks.map((mark, index) => {
                      const gradeInfo = getGrade(mark.total);
                      return (
                        <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-3 text-center">{index + 1}</td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="text"
                                value={mark.rollNo}
                                onChange={(e) => handleMarkChange(index, 'rollNo', e.target.value)}
                                className="w-full p-1 border rounded"
                              />
                            ) : (
                              mark.rollNo
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="text"
                                value={mark.name}
                                onChange={(e) => handleMarkChange(index, 'name', e.target.value)}
                                className="w-full p-1 border rounded"
                              />
                            ) : (
                              mark.name
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={mark.midMarks}
                                onChange={(e) => handleMarkChange(index, 'midMarks', e.target.value)}
                                className="w-full p-1 border rounded text-center"
                              />
                            ) : (
                              mark.midMarks
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={mark.lab}
                                onChange={(e) => handleMarkChange(index, 'lab', e.target.value)}
                                className="w-full p-1 border rounded text-center"
                              />
                            ) : (
                              mark.lab
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={mark.assignmentQuiz}
                                onChange={(e) => handleMarkChange(index, 'assignmentQuiz', e.target.value)}
                                className="w-full p-1 border rounded text-center"
                              />
                            ) : (
                              mark.assignmentQuiz
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={mark.attendance}
                                onChange={(e) => handleMarkChange(index, 'attendance', e.target.value)}
                                className="w-full p-1 border rounded text-center"
                              />
                            ) : (
                              mark.attendance
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{mark.total}</td>
                          <td className={`px-4 py-3 text-center font-bold ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                          </td>
                          {editMode && user.userType === 'staff' && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeStudent(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                  
                  {/* Add new student row */}
                  {editMode && user.userType === 'staff' && (
                    <tr className="border-t-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                      <td className="px-4 py-3 text-center font-bold">New</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Roll No"
                          value={newStudent.rollNo}
                          onChange={(e) => setNewStudent({...newStudent, rollNo: e.target.value})}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={newStudent.name}
                          onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={newStudent.midMarks}
                          onChange={(e) => setNewStudent({...newStudent, midMarks: parseInt(e.target.value) || 0})}
                          className="w-full p-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={newStudent.lab}
                          onChange={(e) => setNewStudent({...newStudent, lab: parseInt(e.target.value) || 0})}
                          className="w-full p-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={newStudent.assignmentQuiz}
                          onChange={(e) => setNewStudent({...newStudent, assignmentQuiz: parseInt(e.target.value) || 0})}
                          className="w-full p-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={newStudent.attendance}
                          onChange={(e) => setNewStudent({...newStudent, attendance: parseInt(e.target.value) || 0})}
                          className="w-full p-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {calculateTotal(newStudent.midMarks, newStudent.lab, newStudent.assignmentQuiz, newStudent.attendance)}
                      </td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={addNewStudent}
                          className="text-green-600 hover:text-green-800"
                        >
                          <FaPlus />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {selectedPaper === 'all' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
          <div className="mb-4">
            <FaEye className="mx-auto text-4xl text-blue-600 dark:text-blue-400 mb-2" />
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
              All Papers Report
            </h3>
            <p className="text-blue-600 dark:text-blue-300 mb-4">
              {user.userType === 'student' 
                ? 'Download a comprehensive report containing all your subject marks in one PDF document.'
                : 'All Papers view is available for students to download their comprehensive report.'
              }
            </p>
            {user.userType === 'student' && (
              <button
                onClick={downloadStudentPDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mx-auto"
              >
                <FaDownload />
                Download All Papers Report
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default InternalMarks;