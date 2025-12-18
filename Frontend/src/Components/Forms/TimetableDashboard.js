import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const TimetableDashboard = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [generateForm, setGenerateForm] = useState({
    department: '',
    semester: '',
    year: ''
  });
  
  const [viewFilters, setViewFilters] = useState({
    department: '',
    semester: '',
    year: '',
    section: '',
    teacher: ''
  });

  // Data states
  const [timetableData, setTimetableData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [papers, setPapers] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Constants
  const semesters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = ['1', '2', '3', '4'];
  const timeSlots = {
    '1': '9:30 - 10:20',
    '2': '10:20 - 11:10',
    '3': '1:20 - 2:10',
    '4': '2:10 - 3:00'
  };

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user, fetchInitialData]);

  useEffect(() => {
    if (activeTab !== 'generate' && user) {
      fetchTimetableData();
    }
  }, [activeTab, viewFilters, user, fetchTimetableData]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch staff data
      let staff = [];
      try {
        const staffRes = await axios.get('/staff');
        staff = staffRes.data || [];
      } catch (staffError) {
        console.error('Error fetching staff:', staffError);
        // Continue with empty staff array
      }

      // Fetch papers data
      let allPapers = [];
      try {
        const papersRes = await axios.get('/paper/all');
        allPapers = papersRes.data || [];
      } catch (papersError) {
        console.error('Error fetching papers:', papersError);
        // Continue with empty papers array
      }

      setTeachers(staff.filter(s => s.role === 'teacher' || s.role === 'HOD'));
      setPapers(allPapers);
      
      // Fetch all departments from API and filter for timetable
      try {
        const deptResponse = await axios.get('/staff/departments');
        const allDepts = deptResponse.data.departments || [];
        
        // Filter to only show Computer Science and Engineering for timetable
        const timetableDepts = allDepts.filter(dept => 
          dept === 'Computer Science and Engineering' || 
          dept === 'Computer Science and Engineering (CSE)' ||
          dept === 'Computer Science' ||
          dept === 'CSE'
        );
        setDepartments(timetableDepts.length > 0 ? timetableDepts : ['Computer Science and Engineering']);
      } catch (deptError) {
        console.error('Error fetching departments:', deptError);
        // Fallback to extracting from staff data
        const uniqueDepts = [...new Set(staff.map(s => s.department).filter(Boolean))];
        const timetableDepts = uniqueDepts.filter(dept => 
          dept === 'Computer Science and Engineering' || 
          dept === 'Computer Science and Engineering (CSE)' ||
          dept === 'Computer Science' ||
          dept === 'CSE'
        );
        setDepartments(timetableDepts.length > 0 ? timetableDepts : ['Computer Science and Engineering']);
      }
      
      // Set default department for user (only if not already set)
      if (user?.department) {
        setGenerateForm(prev => prev.department ? prev : { ...prev, department: user.department });
        setViewFilters(prev => prev.department ? prev : { ...prev, department: user.department });
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTimetableData = useCallback(async () => {
    if (!viewFilters.department) return;
    
    setLoading(true);
    try {
      let url = `/time-schedule/department/${viewFilters.department}`;
      const params = new URLSearchParams();
      
      if (viewFilters.semester) params.append('semester', viewFilters.semester);
      if (viewFilters.year) params.append('year', viewFilters.year);
      if (viewFilters.section) params.append('section', viewFilters.section);
      if (viewFilters.teacher) params.append('teacher', viewFilters.teacher);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url);
      setTimetableData(response.data || []);
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      // Don't show error toast for empty data, just log it
      if (error.response?.status !== 404) {
        toast.error('Failed to load timetable data');
      }
      setTimetableData([]);
    } finally {
      setLoading(false);
    }
  }, [viewFilters]);

  const handleGenerateTimetable = async () => {
    if (!generateForm.department || !generateForm.semester || !generateForm.year) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/time-schedule/generate', {
        department: generateForm.department,
        semester: generateForm.semester,
        year: generateForm.year,
        createdBy: user._id
      });

      toast.success(response.data.message || 'Timetable generated successfully');
      
      // Switch to view tab to see generated timetable
      setViewFilters({
        department: generateForm.department,
        semester: generateForm.semester,
        year: generateForm.year,
        section: '',
        teacher: ''
      });
      setActiveTab('section');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule({
      ...schedule,
      newPaper: schedule.paper._id,
      newTeacher: schedule.teacher._id
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      await axios.patch(`/time-schedule/${editingSchedule._id}`, {
        paper: editingSchedule.newPaper,
        teacher: editingSchedule.newTeacher
      });

      toast.success('Schedule updated successfully');
      setEditingSchedule(null);
      fetchTimetableData();
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await axios.delete(`/time-schedule/${scheduleId}`);
      toast.success('Schedule deleted successfully');
      fetchTimetableData();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const renderTimetableGrid = (data, groupBy = 'section') => {
    if (!data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          No timetable data found for the selected criteria.
        </div>
      );
    }

    // Group data by the specified criteria
    const grouped = data.reduce((acc, schedule) => {
      let key;
      switch (groupBy) {
        case 'section':
          key = schedule.section;
          break;
        case 'teacher':
          key = schedule.teacher.name;
          break;
        case 'department':
          key = schedule.department;
          break;
        default:
          key = schedule.section;
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(schedule);
      return acc;
    }, {});

    return Object.entries(grouped).map(([groupKey, schedules]) => (
      <div key={groupKey} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          {groupBy === 'teacher' ? `Teacher: ${groupKey}` : 
           groupBy === 'department' ? `Department: ${groupKey}` :
           `Section: ${groupKey}`}
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time / Day
                </th>
                {days.map(day => (
                  <th key={day} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hours.map(hour => (
                <tr key={hour}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>
                      <div>Hour {hour}</div>
                      <div className="text-xs text-gray-500">{timeSlots[hour]}</div>
                    </div>
                  </td>
                  {days.map(day => {
                    const schedule = schedules.find(s => s.day === day && s.hour === hour);
                    return (
                      <td key={`${day}-${hour}`} className="px-4 py-3 whitespace-nowrap text-sm">
                        {schedule ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <div className="font-medium text-blue-900">
                              {schedule.paper.paper}
                            </div>
                            <div className="text-xs text-blue-700">
                              {schedule.teacher.name}
                            </div>
                            {activeTab === 'edit' && (
                              <div className="mt-2 flex space-x-1">
                                <button
                                  onClick={() => handleEditSchedule(schedule)}
                                  className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(schedule._id)}
                                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                >
                                  Del
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-center">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Generate Complete Timetable (HOD)</h2>
            
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
                  <option value="">Select Year</option>
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
        );

      case 'section':
      case 'all':
      case 'department':
      case 'teacher':
      case 'edit':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              {activeTab === 'section' ? 'View/Edit by Section' :
               activeTab === 'all' ? 'View All Schedules' :
               activeTab === 'department' ? 'View by Dept/Sem/Year' :
               activeTab === 'teacher' ? 'View by Teacher' :
               'Timetable Changes'}
            </h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={viewFilters.department}
                  onChange={(e) => setViewFilters({...viewFilters, department: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                <select
                  value={viewFilters.semester}
                  onChange={(e) => setViewFilters({...viewFilters, semester: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={viewFilters.year}
                  onChange={(e) => setViewFilters({...viewFilters, year: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              
              {(activeTab === 'section' || activeTab === 'all') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <select
                    value={viewFilters.section}
                    onChange={(e) => setViewFilters({...viewFilters, section: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Sections</option>
                    {sections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {(activeTab === 'teacher' || activeTab === 'all') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
                  <select
                    value={viewFilters.teacher}
                    onChange={(e) => setViewFilters({...viewFilters, teacher: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Timetable Display */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="ml-4">Loading timetable...</p>
              </div>
            ) : (
              <div>
                {renderTimetableGrid(
                  timetableData,
                  activeTab === 'teacher' ? 'teacher' :
                  activeTab === 'department' ? 'department' : 'section'
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">HOD Timetable Dashboard</h1>
      
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'generate', name: 'Generate Timetable', color: 'bg-purple-600' },
              { id: 'section', name: 'View/Edit by Section', color: 'bg-blue-600' },
              { id: 'all', name: 'View All Schedules', color: 'bg-green-600' },
              { id: 'department', name: 'View by Dept/Sem/Year', color: 'bg-yellow-600' },
              { id: 'teacher', name: 'View by Teacher', color: 'bg-red-600' },
              { id: 'edit', name: 'Timetable Changes', color: 'bg-gray-600' }
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
      {renderTabContent()}

      {/* Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Schedule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingSchedule.day} - Hour {editingSchedule.hour} ({timeSlots[editingSchedule.hour]})
                </label>
                <p className="text-sm text-gray-600">Section: {editingSchedule.section}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper</label>
                <select
                  value={editingSchedule.newPaper}
                  onChange={(e) => setEditingSchedule({...editingSchedule, newPaper: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {papers
                    .filter(p => p.department === editingSchedule.department && 
                                p.semester === editingSchedule.semester)
                    .map(paper => (
                    <option key={paper._id} value={paper._id}>{paper.paper}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select
                  value={editingSchedule.newTeacher}
                  onChange={(e) => setEditingSchedule({...editingSchedule, newTeacher: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {teachers
                    .filter(t => t.department === editingSchedule.department)
                    .map(teacher => (
                    <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                  ))}
                </select>
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

export default TimetableDashboard;