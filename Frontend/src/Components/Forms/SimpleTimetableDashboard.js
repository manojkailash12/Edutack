import React, { useState, useEffect, useContext } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const SimpleTimetableDashboard = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timetableData, setTimetableData] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // Form states
  const [generateForm, setGenerateForm] = useState({
    department: '',
    semester: '',
    year: '2024-2025'
  });

  // Constants
  const semesters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    // Fetch departments
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/staff/departments');
        const allDepts = response.data.departments || [];
        
        // Filter to only show Computer Science related departments for timetable
        const timetableDepts = allDepts.filter(dept => 
          dept === 'Computer Science and Engineering' || 
          dept === 'Computer Science and Engineering (CSE)' ||
          dept === 'Computer Science' ||
          dept === 'CSE'
        );
        setDepartments(timetableDepts.length > 0 ? timetableDepts : ['Computer Science and Engineering']);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setDepartments(['Computer Science and Engineering']);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    // Set default department for user
    if (user?.department && !generateForm.department) {
      setGenerateForm(prev => ({ ...prev, department: user.department }));
    }
  }, [user, generateForm.department]);

  const handleGenerateTimetable = async () => {
    if (!generateForm.department || !generateForm.semester || !generateForm.year) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/time-schedule/generate', {
        department: generateForm.department,
        semester: generateForm.semester,
        year: generateForm.year,
        createdBy: user._id
      });

      toast.success(response.data.message || 'Timetable generated successfully');
      setActiveTab('view');
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.response?.data?.message || 'Failed to generate timetable');
      toast.error(error.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };



  const fetchTimetableData = async () => {
    if (!generateForm.department) return;
    
    setLoading(true);
    try {
      let url = `/time-schedule/department/${generateForm.department}`;
      const params = new URLSearchParams();
      
      if (generateForm.semester) params.append('semester', generateForm.semester);
      if (generateForm.year) params.append('year', generateForm.year);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url);
      setTimetableData(response.data || []);
      toast.success('Timetable data loaded successfully');
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      setTimetableData([]);
      if (error.response?.status !== 404) {
        toast.error('Failed to load timetable data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await axios.delete(`/time-schedule/${scheduleId}`);
      toast.success('Schedule deleted successfully');
      fetchTimetableData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      await axios.patch(`/time-schedule/${editingSchedule._id}`, {
        paper: editingSchedule.paper._id,
        teacher: editingSchedule.teacher._id
      });

      toast.success('Schedule updated successfully');
      setEditingSchedule(null);
      fetchTimetableData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  // Show loading while user data is being fetched
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading user data...</p>
      </div>
    );
  }

  if (user?.role !== 'HOD' && user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to HOD and Admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">HOD Timetable Dashboard (Simple)</h1>
      


      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'generate', name: 'Generate Timetable' },
              { id: 'view', name: 'View Timetable' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
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
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'generate' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Generate Complete Timetable</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={generateForm.department}
                  onChange={(e) => setGenerateForm({...generateForm, department: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                <select
                  value={generateForm.semester}
                  onChange={(e) => setGenerateForm({...generateForm, semester: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Semester</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={generateForm.year}
                  onChange={(e) => setGenerateForm({...generateForm, year: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleGenerateTimetable}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Timetable'}
            </button>
          </div>
        )}

        {activeTab === 'view' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">View Timetable</h2>
            
            <div className="mb-4">
              <button
                onClick={fetchTimetableData}
                disabled={loading || !generateForm.department}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Timetable'}
              </button>
            </div>

            {timetableData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paper</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timetableData.map((schedule, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {schedule.section}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {schedule.day}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          Hour {schedule.hour}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {schedule.paper?.paper || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {schedule.teacher?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditSchedule(schedule)}
                              className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(schedule._id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {generateForm.department ? 
                  'No timetable data found. Try generating a timetable first.' : 
                  'Please select department, semester, and year to view timetable.'
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Schedule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingSchedule.day} - Hour {editingSchedule.hour}
                </label>
                <p className="text-sm text-gray-600">Section: {editingSchedule.section}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper</label>
                <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">
                  {editingSchedule.paper?.paper || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">
                  {editingSchedule.teacher?.name || 'N/A'}
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Note: Full editing functionality requires paper and teacher selection dropdowns.</p>
                <p>This is a simplified version for demonstration.</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingSchedule(null)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTimetableDashboard;