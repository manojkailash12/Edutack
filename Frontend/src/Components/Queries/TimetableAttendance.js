import { useState, useContext, useEffect, useCallback } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { TableHeader } from "../Table";

const TimetableAttendance = () => {
  const { user } = useContext(UserContext);
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [timetableInfo, setTimetableInfo] = useState(null);

  // Fetch timetable-based papers for the teacher
  const fetchTimetablePapers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/attendance/timetable-papers/${user._id}`);
      setPapers(res.data.papers || []);
      
      if (res.data.papers.length === 0) {
        toast.warning(res.data.message || "No timetable found. Please contact admin.");
      }
    } catch (err) {
      console.error('Error fetching timetable papers:', err);
      setPapers([]);
      toast.error("Failed to load papers from timetable");
    } finally {
      setLoading(false);
    }
  }, [user._id]);

  // Fetch available dates when paper and section are selected
  const fetchAvailableDates = useCallback(async () => {
    if (!selectedPaper || !selectedSection) {
      setAvailableDates([]);
      return;
    }

    try {
      setLoadingDates(true);
      const res = await axios.get(`/attendance/available-dates/${user._id}/${selectedPaper}/${selectedSection}`);
      setAvailableDates(res.data.availableDates || []);
      setTimetableInfo(res.data.timetableInfo);
      
      if (res.data.availableDates.length === 0) {
        toast.info(res.data.message || "No scheduled classes found for this paper and section");
      }
    } catch (err) {
      console.error('Error fetching available dates:', err);
      setAvailableDates([]);
      toast.error("Failed to load available dates");
    } finally {
      setLoadingDates(false);
    }
  }, [user._id, selectedPaper, selectedSection]);

  // Fetch students for the selected section
  const fetchStudents = useCallback(async () => {
    if (!selectedPaper || !selectedSection) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`/attendance/students/${selectedPaper}/${selectedSection}`);
      const studentsWithStatus = (res.data || []).map(student => ({
        ...student,
        status: 'present' // Default to present
      }));
      setStudents(studentsWithStatus);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [selectedPaper, selectedSection]);

  // Load papers on component mount
  useEffect(() => {
    if (user.userType === 'staff') {
      fetchTimetablePapers();
    }
  }, [user.userType, fetchTimetablePapers]);

  // Load available dates when paper/section changes
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Load students when paper/section changes
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset selections when paper changes
  useEffect(() => {
    setSelectedSection("");
    setSelectedDate("");
    setAvailableDates([]);
    setStudents([]);
  }, [selectedPaper]);

  // Reset date when section changes
  useEffect(() => {
    setSelectedDate("");
  }, [selectedSection]);

  const handleStudentStatusChange = (studentId, status) => {
    setStudents(prev => prev.map(student => 
      student._id === studentId ? { ...student, status } : student
    ));
  };

  const handleMarkAll = (status) => {
    setStudents(prev => prev.map(student => ({ ...student, status })));
  };

  const handleSaveAttendance = async () => {
    if (!selectedPaper || !selectedSection || !selectedDate) {
      toast.error("Please select paper, section, and date");
      return;
    }

    setSaving(true);
    try {
      const attendanceData = {
        paper: selectedPaper,
        section: selectedSection,
        date: selectedDate,
        students: students.map(s => ({
          student: s._id,
          rollNo: s.rollNo,
          name: s.name,
          status: s.status || 'present'
        })),
        teacherId: user._id,
      };

      await axios.post('/attendance', attendanceData);
      toast.success('Attendance saved successfully!');
      
      // Refresh available dates to update attendance status
      fetchAvailableDates();
    } catch (err) {
      console.error('Attendance save error:', err);
      if (err.response?.status === 409) {
        toast.error('Attendance already exists for this date');
      } else {
        toast.error(err.response?.data?.message || 'Failed to save attendance');
      }
    } finally {
      setSaving(false);
    }
  };

  // Get selected paper details
  const selectedPaperDetails = papers.find(p => p._id === selectedPaper);
  
  // Get selected date details
  const selectedDateDetails = availableDates.find(d => d.date === selectedDate);

  // Filter dates by attendance status
  const pendingDates = availableDates.filter(d => !d.hasAttendance);
  const completedDates = availableDates.filter(d => d.hasAttendance);

  if (loading && papers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="timetable-attendance p-4">
      <h2 className="mb-4 text-3xl font-bold text-violet-900 dark:text-slate-200 flex items-center gap-2">
        <FaCalendarAlt /> Timetable-Based Attendance
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Smart Attendance System
        </h3>
        <p className="text-blue-700 dark:text-blue-300">
          This system only shows dates when your subject is actually scheduled according to the timetable. 
          No more confusion about which days to mark attendance!
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-8">
          <FaTimesCircle className="mx-auto text-6xl text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">No Timetable Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please contact the admin to generate your timetable first.
          </p>
        </div>
      ) : (
        <>
          {/* Paper and Section Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Paper</label>
              <select 
                value={selectedPaper} 
                onChange={e => setSelectedPaper(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-gray-600"
              >
                <option value="">Choose a paper...</option>
                {papers.map(paper => (
                  <option key={paper._id} value={paper._id}>
                    {paper.paper} (Sem {paper.semester}) - {paper.scheduledDays.join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {selectedPaperDetails && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Section</label>
                <select 
                  value={selectedSection} 
                  onChange={e => setSelectedSection(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-gray-600"
                >
                  <option value="">Choose a section...</option>
                  {selectedPaperDetails.scheduledSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Timetable Info */}
          {timetableInfo && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Timetable Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Department:</span> {timetableInfo.department}
                </div>
                <div>
                  <span className="font-medium">Semester:</span> {timetableInfo.semester}
                </div>
                <div>
                  <span className="font-medium">Year:</span> {timetableInfo.year}
                </div>
                <div>
                  <span className="font-medium">Scheduled Days:</span> {timetableInfo.scheduledDays.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Available Dates */}
          {selectedPaper && selectedSection && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FaClock /> Available Class Dates
              </h3>
              
              {loadingDates ? (
                <div className="text-center py-4">Loading available dates...</div>
              ) : availableDates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No scheduled classes found for this paper and section
                </div>
              ) : (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{availableDates.length}</div>
                      <div className="text-blue-800 dark:text-blue-200">Total Classes</div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{pendingDates.length}</div>
                      <div className="text-yellow-800 dark:text-yellow-200">Pending</div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{completedDates.length}</div>
                      <div className="text-green-800 dark:text-green-200">Completed</div>
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Date for Attendance</label>
                    <select 
                      value={selectedDate} 
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-gray-600"
                    >
                      <option value="">Choose a date...</option>
                      <optgroup label="Pending Attendance">
                        {pendingDates.map(dateInfo => (
                          <option key={dateInfo.date} value={dateInfo.date}>
                            {dateInfo.date} ({dateInfo.dayName}) - Pending
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Completed Attendance">
                        {completedDates.map(dateInfo => (
                          <option key={dateInfo.date} value={dateInfo.date}>
                            {dateInfo.date} ({dateInfo.dayName}) - ✓ Completed
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Date Details */}
                  {selectedDateDetails && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {selectedDateDetails.hasAttendance ? (
                            <FaCheckCircle className="text-green-500" />
                          ) : (
                            <FaClock className="text-yellow-500" />
                          )}
                          <span className="font-medium">
                            {selectedDateDetails.date} ({selectedDateDetails.dayName})
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Status: {selectedDateDetails.hasAttendance ? 'Attendance Completed' : 'Attendance Pending'}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Student List */}
          {selectedDate && students.length > 0 && (
            <div className="mb-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                Mark Attendance for {selectedDateDetails?.date} ({selectedDateDetails?.dayName})
              </h3>
              
              {selectedDateDetails?.hasAttendance && (
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    ⚠️ Attendance already exists for this date. Saving will overwrite the existing record.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => handleMarkAll('present')} 
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <FaCheckCircle /> Mark All Present
                </button>
                <button 
                  onClick={() => handleMarkAll('absent')} 
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <FaTimesCircle /> Mark All Absent
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <TableHeader headers={["Roll No", "Name", "Status", "Actions"]} />
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className={student.status === 'absent' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}>
                        <td className="px-4 py-3 border">{student.rollNo}</td>
                        <td className="px-4 py-3 border font-medium">{student.name}</td>
                        <td className="px-4 py-3 border">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            student.status === 'present' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          }`}>
                            {student.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-4 py-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStudentStatusChange(student._id, 'present')}
                              className={`px-3 py-1 rounded text-sm ${
                                student.status === 'present'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleStudentStatusChange(student._id, 'absent')}
                              className={`px-3 py-1 rounded text-sm ${
                                student.status === 'absent'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-red-200'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Save Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default TimetableAttendance;