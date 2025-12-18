import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const AdminCertificateManager = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    statistics: {},
    eligibleStudents: [],
    pendingStudents: []
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filters, setFilters] = useState({
    academicYear: '2025-2026', // Match the format used in papers and internal records
    semester: 'Semester 1',
    department: '',
    section: ''
  });
  const [internalMarks, setInternalMarks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const fetchDepartmentsAndSections = useCallback(async () => {
    try {
      const response = await axios.get('/certificates/departments-sections');
      const { departments, sections, academicYears } = response.data.data;
      setDepartments(departments);
      setSections(sections);
      setAcademicYears(academicYears);
      
      // Set default academic year if not already set
      if (academicYears.length > 0 && !filters.academicYear) {
        setFilters(prev => ({ ...prev, academicYear: academicYears[0] }));
      }
    } catch (error) {
      console.error('Error fetching departments and sections:', error);
    }
  }, [filters.academicYear]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/certificates/dashboard', {
        params: {
          academicYear: filters.academicYear,
          semester: filters.semester,
          department: filters.department || undefined,
          section: filters.section || undefined
        }
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchInternalMarks = useCallback(async () => {
    try {
      const response = await axios.get('/internal/all', {
        params: {
          academicYear: filters.academicYear,
          semester: filters.semester
        }
      });
      setInternalMarks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching internal marks:', error);
    }
  }, [filters.academicYear, filters.semester]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDepartmentsAndSections();
    }
  }, [user, fetchDepartmentsAndSections]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
      fetchInternalMarks();
    }
  }, [user, fetchDashboardData, fetchInternalMarks]);



  const handleAddExternalMarks = async (studentId, paperId, marks) => {
    try {
      await axios.post('/certificates/external-marks', {
        studentId,
        paperId,
        externalMarks: marks,
        academicYear: filters.academicYear,
        semester: filters.semester,
        adminId: user._id
      });
      toast.success('External marks added successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding external marks:', error);
      toast.error(error.response?.data?.message || 'Failed to add external marks');
    }
  };

  const handleGenerateCertificate = async (studentId) => {
    try {
      setLoading(true);
      await axios.post('/certificates/generate', {
        studentId,
        academicYear: filters.academicYear,
        semester: filters.semester
      });
      toast.success('Certificate generated and sent successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedStudents.length === 0) {
      toast.warning('Please select students to generate certificates');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/certificates/batch-generate', {
        studentIds: selectedStudents,
        academicYear: filters.academicYear,
        semester: filters.semester
      });
      
      const { successful, failed } = response.data.data;
      toast.success(`Generated ${successful} certificates successfully`);
      if (failed > 0) {
        toast.warning(`Failed to generate ${failed} certificates`);
      }
      
      setSelectedStudents([]);
      fetchDashboardData();
    } catch (error) {
      console.error('Error in batch generation:', error);
      toast.error('Failed to generate certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllEligible = () => {
    const eligibleIds = dashboardData.eligibleStudents.map(s => s._id);
    setSelectedStudents(eligibleIds);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Certificate Management</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({...filters, semester: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={`Semester ${sem}`}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={filters.section}
              onChange={(e) => setFilters({...filters, section: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.statistics.totalStudents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eligible for Certificate</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.statistics.eligibleStudents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Students</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.statistics.pendingStudents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Generated Certificates</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.statistics.totalCertificates || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'dashboard', name: 'Dashboard' },
              { id: 'internal-marks', name: 'Internal Marks' },
              { id: 'external-marks', name: 'External Marks' },
              { id: 'generate-certificates', name: 'Generate Certificates' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Eligible Students */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-700">Students Ready for Certificate</h3>
                <div className="max-h-96 overflow-y-auto">
                  {dashboardData.eligibleStudents.length > 0 ? (
                    dashboardData.eligibleStudents.map((student) => (
                      <div key={student._id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg mb-2">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.rollNo} - {student.department} {student.section}</p>
                        </div>
                        <button
                          onClick={() => handleGenerateCertificate(student._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          disabled={loading}
                        >
                          Generate
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No students ready for certificate generation</p>
                  )}
                </div>
              </div>

              {/* Pending Students */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-yellow-700">Students Pending External Marks</h3>
                <div className="max-h-96 overflow-y-auto">
                  {dashboardData.pendingStudents.length > 0 ? (
                    dashboardData.pendingStudents.map((student) => (
                      <div key={student._id} className="p-3 bg-yellow-50 rounded-lg mb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.rollNo} - {student.department} {student.section}</p>
                          </div>
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                            {student.missingSubjects || 0} subjects pending
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{student.reason}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No students pending external marks</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'internal-marks' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Internal Marks Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paper</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {internalMarks.map((internal) => (
                      <tr key={internal._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{internal.paper?.paper}</div>
                          <div className="text-sm text-gray-500">{internal.paper?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {internal.marks?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {internal.marks?.length > 0 
                            ? (internal.marks.reduce((sum, mark) => sum + mark.total, 0) / internal.marks.length).toFixed(1)
                            : 'N/A'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Submitted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'external-marks' && (
            <ExternalMarksTab 
              dashboardData={dashboardData}
              filters={filters}
              onAddExternalMarks={handleAddExternalMarks}
              loading={loading}
            />
          )}

          {activeTab === 'generate-certificates' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Generate Certificates</h3>
                <div className="space-x-2">
                  <button
                    onClick={selectAllEligible}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Select All Eligible
                  </button>
                  <button
                    onClick={handleBatchGenerate}
                    disabled={selectedStudents.length === 0 || loading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Generate Selected ({selectedStudents.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.eligibleStudents.map((student) => (
                  <div key={student._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleStudentSelection(student._id)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.rollNo}</p>
                        <p className="text-sm text-gray-600">{student.department} - {student.section}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Subjects: {student.subjects?.length || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// External Marks Tab Component
const ExternalMarksTab = ({ dashboardData, filters, onAddExternalMarks, loading }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [externalMarks, setExternalMarks] = useState({});
  const [existingExternalMarks, setExistingExternalMarks] = useState({});
  const [loadingExternalMarks, setLoadingExternalMarks] = useState(false);

  // Fetch existing external marks for selected student
  const fetchExistingExternalMarks = async (studentId) => {
    if (!studentId) return;
    
    console.log('=== FETCHING EXTERNAL MARKS ===');
    console.log('Student ID:', studentId);
    console.log('Academic Year:', filters.academicYear);
    console.log('Semester:', filters.semester);
    
    setLoadingExternalMarks(true);
    try {
      const response = await axios.get(`/certificates/external-marks/${studentId}`, {
        params: {
          academicYear: filters.academicYear,
          semester: filters.semester
        }
      });
      
      console.log('External marks response:', response.data);
      
      const existingMarks = {};
      if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data.forEach(mark => {
          existingMarks[mark.paper] = mark.externalMarks;
        });
      }
      
      console.log('Processed existing marks:', existingMarks);
      
      setExistingExternalMarks(existingMarks);
      // Pre-populate the input fields with existing marks
      setExternalMarks(existingMarks);
      
      if (Object.keys(existingMarks).length > 0) {
        toast.success(`Found existing marks for ${Object.keys(existingMarks).length} subjects`);
      }
    } catch (error) {
      console.error('Error fetching existing external marks:', error);
      console.error('Error details:', error.response?.data);
      setExistingExternalMarks({});
      setExternalMarks({});
      toast.error('Failed to load existing external marks');
    } finally {
      setLoadingExternalMarks(false);
    }
  };

  const handleAddMarks = async (paperId) => {
    const marks = parseInt(externalMarks[paperId] || 0);
    if (marks < 0 || marks > 40) {
      toast.error('External marks must be between 0 and 40');
      return;
    }

    await onAddExternalMarks(selectedStudent._id, paperId, marks);
    // Update existing marks after successful save
    setExistingExternalMarks(prev => ({ ...prev, [paperId]: marks }));
  };

  // Combine both eligible and pending students for external marks addition
  const allStudents = [...(dashboardData.eligibleStudents || []), ...(dashboardData.pendingStudents || [])];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Add External Marks</h3>
      
      {/* Student Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
        <select
          value={selectedStudent?._id || ''}
          onChange={(e) => {
            const student = allStudents.find(s => s._id === e.target.value);
            setSelectedStudent(student);
            // Don't reset marks here - let fetchExistingExternalMarks handle it
            if (student) {
              fetchExistingExternalMarks(student._id);
            } else {
              // Only reset if no student selected
              setExternalMarks({});
              setExistingExternalMarks({});
            }
          }}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a student...</option>
          {allStudents.map((student) => (
            <option key={student._id} value={student._id}>
              {student.name} - {student.rollNo} ({student.department} {student.section})
            </option>
          ))}
        </select>
      </div>

      {/* External Marks Form */}
      {selectedStudent && selectedStudent.subjects && selectedStudent.subjects.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-4">
            {Object.keys(existingExternalMarks).length > 0 ? 'Update' : 'Add'} External Marks for {selectedStudent.name}
          </h4>
          
          {loadingExternalMarks && (
            <div className="text-center py-4">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading existing marks...
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {selectedStudent.subjects.map((subject) => {
              const hasExistingMarks = existingExternalMarks[subject.paperId] !== undefined;
              const currentValue = externalMarks[subject.paperId] || '';
              const isModified = hasExistingMarks && currentValue !== existingExternalMarks[subject.paperId].toString();
              
              return (
                <div key={subject.paperId} className="flex items-center space-x-4 p-3 bg-white rounded border">
                  <div className="flex-1">
                    <p className="font-medium">{subject.paperName}</p>
                    <p className="text-sm text-gray-600">Code: {subject.paperCode}</p>
                    <p className="text-sm text-green-600">Internal Marks: {subject.internalMarks}/60</p>
                    {hasExistingMarks && (
                      <p className="text-sm text-blue-600">
                        Current External Marks: {existingExternalMarks[subject.paperId]}/40
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="40"
                      placeholder={hasExistingMarks ? `Current: ${existingExternalMarks[subject.paperId]}` : "External (0-40)"}
                      value={currentValue}
                      onChange={(e) => setExternalMarks({
                        ...externalMarks,
                        [subject.paperId]: e.target.value
                      })}
                      className={`w-32 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        hasExistingMarks ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                      }`}
                    />
                    <button
                      onClick={() => handleAddMarks(subject.paperId)}
                      disabled={loading || !currentValue || (hasExistingMarks && !isModified)}
                      className={`px-3 py-2 rounded transition duration-200 text-white ${
                        hasExistingMarks 
                          ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400' 
                          : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
                      }`}
                    >
                      {hasExistingMarks ? 'Update' : 'Add'}
                    </button>
                    {hasExistingMarks && (
                      <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedStudent.subjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No internal marks found for this student.</p>
              <p className="text-sm text-gray-400">Staff must submit internal marks first.</p>
            </div>
          )}
        </div>
      )}

      {selectedStudent && (!selectedStudent.subjects || selectedStudent.subjects.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No Internal Marks Available</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This student doesn't have internal marks submitted yet. Please ask the respective staff to submit internal marks first.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificateManager;