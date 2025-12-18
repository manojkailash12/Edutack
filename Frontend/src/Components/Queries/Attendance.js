import { useState, useContext, useEffect, useCallback } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { FaDownload, FaCheckCircle, FaClock } from "react-icons/fa";
import { TableHeader } from "../Table";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Modal from 'react-modal';

// Set the app element for react-modal
Modal.setAppElement('#root');

function downloadCSV(rows, headers, filename) {
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    csvRows.push(row.map(val => `"${val ?? ''}"`).join(","));
  }
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const Attendance = () => {
  const { user } = useContext(UserContext);
  const [date, setDate] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedPaper, setSelectedPaper] = useState("");
  const [papers, setPapers] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [timetableInfo, setTimetableInfo] = useState(null);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [manualStudents, setManualStudents] = useState([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [minPercent, setMinPercent] = useState('');
  const [maxPercent, setMaxPercent] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterName, setFilterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [drilldownStudent, setDrilldownStudent] = useState(null); // { studentId, name, paperId, section }
  const [drilldownDetails, setDrilldownDetails] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Add a safe function at the top of the component
  const safe = v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''));

  // Fetch timetable-based papers for faculty on mount
  const fetchPapers = useCallback(async () => {
    try {
      console.log('Fetching timetable papers for teacher:', user._id);
      const res = await axios.get(`/attendance/timetable-papers/${user._id}`, {
        timeout: 30000 // 30 seconds timeout
      });
      console.log('Fetched timetable papers response:', res.data);
      const papersData = res.data.papers || [];
      setPapers(papersData);
      
      // Papers loaded silently
      
      // Auto-select all papers for summary if none are selected
      if (papersData.length > 0 && selectedPaperIds.length === 0) {
        const paperIds = papersData.map(p => p._id);
        console.log('Auto-selecting paper IDs:', paperIds);
        setSelectedPaperIds(paperIds);
      }
    } catch (err) {
      console.error('Error fetching timetable papers:', err);
      
      // Fallback to regular papers if timetable papers fail
      try {
        console.log('Falling back to regular papers...');
        const fallbackRes = await axios.get(`/attendance/teacher-papers/${user._id}`, {
          timeout: 30000
        });
        const fallbackPapers = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
        setPapers(fallbackPapers);
        
        if (fallbackPapers.length > 0) {
          // Auto-select papers for summary
          if (selectedPaperIds.length === 0) {
            setSelectedPaperIds(fallbackPapers.map(p => p._id));
          }
        }
      } catch (fallbackErr) {
        setPapers([]);
      }
    }
  }, [user._id, selectedPaperIds.length]);

  // Fetch available dates when paper and section are selected
  const fetchAvailableDates = useCallback(async () => {
    if (!selectedPaper || !selectedSection) {
      setAvailableDates([]);
      return;
    }

    try {
      setLoadingDates(true);
      console.log('Fetching available dates for:', { 
        teacherId: user._id, 
        paperId: selectedPaper, 
        section: selectedSection 
      });
      
      const url = `/attendance/available-dates/${user._id}/${selectedPaper}/${selectedSection}`;
      console.log('API URL:', url);
      
      const res = await axios.get(url, {
        timeout: 60000 // 60 seconds timeout for date generation
      });
      
      console.log('Available dates response:', res.data);
      setAvailableDates(res.data.availableDates || []);
      setTimetableInfo(res.data.timetableInfo);
      
      // Dates loaded silently
    } catch (err) {
      console.error('❌ Error fetching available dates:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, [user._id, selectedPaper, selectedSection]);

  useEffect(() => {
    if (user.userType === 'staff') {
      fetchPapers();
    }
  }, [user.userType, fetchPapers]);

  // Load available dates when paper/section changes
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Auto-refresh papers every 15 seconds
  useEffect(() => {
    if (user.userType !== 'staff') return;
    
    const interval = setInterval(() => {
      fetchPapers();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [user.userType, fetchPapers]);

  // Fetch students for the selected paper and section
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
      
      // Sort students by roll number for better organization
      studentsWithStatus.sort((a, b) => {
        const rollA = a.rollNo || "";
        const rollB = b.rollNo || "";
        const numA = parseInt(rollA.replace(/\D/g, '')) || 0;
        const numB = parseInt(rollB.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      setStudents(studentsWithStatus);
      setManualStudents([]); // Reset manual students
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
      setManualStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPaper, selectedSection]);

  // Load students when paper/section changes
  useEffect(() => {
    fetchStudents();
    setAttendanceSaved(false); // Reset saved state when changing selection
  }, [fetchStudents]);

  // Add a manual student row
  const handleAddManualStudent = () => {
    setManualStudents(prev => [
      ...prev,
      { rollNo: '', name: '', status: 'present', _id: `manual-${Date.now()}-${Math.random()}` }
    ]);
  };

  // Update manual student row
  const handleManualStudentChange = (idx, field, value) => {
    setManualStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  // Remove manual student row
  const handleRemoveManualStudent = (idx) => {
    setManualStudents(prev => prev.filter((_, i) => i !== idx));
  };

  // Check if attendance already exists for the selected paper, section and date
  useEffect(() => {
    const checkAttendanceExists = async () => {
      if (selectedPaper && selectedSection && date) {
        try {
          const res = await axios.get(`/attendance?paper=${selectedPaper}&section=${selectedSection}&date=${date}`);
          setAttendanceExists(res.data && res.data.exists);
        } catch (err) {
          setAttendanceExists(false);
        }
      } else {
        setAttendanceExists(false);
      }
    };
    checkAttendanceExists();
  }, [selectedPaper, selectedSection, date]);

  // Fetch attendance summary for all papers taught by this teacher (with filters)
  const fetchAttendanceSummary = useCallback(async () => {
    if (!papers.length || !selectedPaperIds.length) {
      console.log('Skipping attendance summary fetch:', { papersLength: papers.length, selectedPaperIdsLength: selectedPaperIds.length });
      setAttendanceSummary([]);
      return;
    }
    setSummaryLoading(true);
    try {
      // Build query params for filters
      const params = new URLSearchParams();
      params.append('paperIds', selectedPaperIds.join(','));
      if (filterSection) params.append('section', filterSection);
      if (filterName) params.append('name', filterName);
      if (minPercent !== '') params.append('minPercent', minPercent);
      if (maxPercent !== '') params.append('maxPercent', maxPercent);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const url = `/attendance/paper-report?${params.toString()}`;
      console.log('Fetching attendance summary from:', url);
      console.log('Selected paper IDs:', selectedPaperIds);
      
      const res = await axios.get(url, {
        timeout: 30000 // 30 seconds timeout
      });
      console.log('Attendance summary response:', res.data);
      
      let allSummaries = [];
      if (res.data && Array.isArray(res.data.attendanceReport)) {
        allSummaries = res.data.attendanceReport.map(r => ({
          paper: r.paper,
          section: r.section,
          name: r.studentName || r.name || '',
          studentId: r.studentId,
          totalClasses: r.totalClasses,
          presentClasses: r.presentClasses,
          attendancePercentage: r.attendancePercentage
        }));
      }
      console.log('Processed attendance summaries:', allSummaries);
      setAttendanceSummary(allSummaries);
    } catch (err) {
      console.error('Error fetching attendance summary:', err);
      setAttendanceSummary([]);

    } finally {
      setSummaryLoading(false);
    }
  }, [papers, selectedPaperIds, filterSection, filterName, minPercent, maxPercent, startDate, endDate]);

  useEffect(() => {
    if (user.userType === 'staff' && papers.length > 0) {
      fetchAttendanceSummary();
    }
  }, [user.userType, fetchAttendanceSummary, papers.length]);

  // Auto-refresh attendance summary every 15 seconds
  useEffect(() => {
    if (user.userType !== 'staff' || !papers.length || !selectedPaperIds.length) return;
    
    const interval = setInterval(() => {
      fetchAttendanceSummary();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [user.userType, papers.length, selectedPaperIds.length, fetchAttendanceSummary]);

  const handleStudentStatusChange = (studentId, status) => {
    setStudents(prev => prev.map(student => student._id === studentId ? { ...student, status } : student));
  };

  const handleMarkAll = (status) => {
    setStudents(prev => prev.map(student => ({ ...student, status })));
  };

  // Check if date is holiday or Sunday
  const checkHolidayStatus = async (checkDate) => {
    try {
      const response = await axios.get(`/academic-calendar/check-holiday/${checkDate}`);
      return response.data;
    } catch (error) {
      console.error('Error checking holiday status:', error);
      return { shouldHoldClasses: true }; // Default to allow if check fails
    }
  };

  // Save attendance for the selected paper, section and date
  const handleSaveAttendance = async () => {
    if (!selectedPaper || !selectedSection || !date) {
      return;
    }

    setSaving(true);
    try {
      // Check if the selected date is a holiday or Sunday
      const holidayStatus = await checkHolidayStatus(date);
      
      if (!holidayStatus.shouldHoldClasses) {
        let message = "Attendance cannot be marked for this date - ";
        if (holidayStatus.isSunday) {
          message += "Sunday (Weekly Holiday)";
        } else if (holidayStatus.isHoliday) {
          message += `Holiday: ${holidayStatus.holidayDetails?.title || 'Academic Holiday'}`;
        }
        
        alert(message);
        setSaving(false);
        return;
      }

      const attendanceData = {
        paper: selectedPaper,
        section: selectedSection,
        date,
        students: [...students, ...manualStudents].map(s => ({
          student: s._id || undefined,
          rollNo: s.rollNo,
          name: s.name,
          status: s.status || 'present'
        })),
        teacherId: user._id,
      };

      console.log('Saving attendance:', attendanceData);
      
      await axios.post('/attendance', attendanceData);
      setAttendanceSaved(true);
      
      // Refresh available dates to update attendance status
      fetchAvailableDates();
    } catch (err) {
      console.error('Attendance save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCurrentPDF = () => {
    try {
      // Create a simple test PDF first
      const doc = new jsPDF();
      doc.text('Test PDF - Attendance Report', 20, 20);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.save('test-attendance.pdf');
    } catch (error) {
      console.error('PDF error:', error);
    }
  };

  // Get unique sections from summary for dropdown
  const uniqueSections = Array.from(new Set(attendanceSummary.map(row => row.section))).filter(Boolean);

  // Get available papers for multi-select
  const paperOptions = Array.isArray(papers) ? papers.map(p => ({ value: p._id, label: p.paper })) : [];

  // Filtered summary based on all filters
  const filteredAttendanceSummary = attendanceSummary.filter(row => {
    const percent = parseFloat(row.attendancePercentage);
    if (minPercent !== '' && percent < parseFloat(minPercent)) return false;
    if (maxPercent !== '' && percent > parseFloat(maxPercent)) return false;
    if (filterSection && row.section !== filterSection) return false;
    if (filterName && !row.name?.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  // PDF export for summary with red marking for <75%
  const handleExportSummaryPDF = () => {
    if (!Array.isArray(filteredAttendanceSummary) || filteredAttendanceSummary.length === 0) {
      return;
    }
    const doc = new jsPDF();
    doc.text("Attendance Summary (Section-wise)", 14, 14);
    const headers = [["Paper", "Section", "Total Classes", "Present Classes", "Attendance %"]];
    const rows = filteredAttendanceSummary.map(row => [
      row.paper,
      row.section,
      row.totalClasses,
      row.presentClasses,
      row.attendancePercentage + "%"
    ]);
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 20,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [80, 80, 200] },
      didParseCell: function (data) {
        // Highlight row in red if attendance % < 75
        if (data.section === 'body' && data.row.index < filteredAttendanceSummary.length) {
          const percent = parseFloat(filteredAttendanceSummary[data.row.index].attendancePercentage);
          if (!isNaN(percent) && percent < 75) {
            data.cell.styles.textColor = [255, 0, 0]; // Red text
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    doc.save(`attendance-summary-${new Date().toISOString().slice(0,10)}.pdf`);
  };



  // Drilldown: fetch per-student attendance detail
  const openDrilldown = async (studentId, name, paperId, section) => {
    setDrilldownStudent({ studentId, name, paperId, section });
    setDrilldownLoading(true);
    setDrilldownModalOpen(true);
    try {
      const params = new URLSearchParams();
      params.append('studentId', studentId);
      params.append('paperId', paperId);
      if (section) params.append('section', section);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const url = `/attendance/student-detail?${params.toString()}`;
      const res = await axios.get(url);
      setDrilldownDetails(res.data.details || []);
    } catch (err) {
      setDrilldownDetails([]);
    } finally {
      setDrilldownLoading(false);
    }
  };
  const closeDrilldown = () => {
    setDrilldownModalOpen(false);
    setDrilldownStudent(null);
    setDrilldownDetails([]);
  };

  // Export drilldown as CSV
  const handleExportDrilldownCSV = () => {
    if (!drilldownDetails.length) return;
    const headers = ["Date", "Roll No", "Name", "Status"];
    const rows = drilldownDetails.map(d => [d.date, d.rollNo || '', d.name || '', d.status]);
    downloadCSV(rows, headers, `attendance-detail-${drilldownStudent?.name || ''}.csv`);
  };
  // Export drilldown as PDF
  const handleExportDrilldownPDF = () => {
    if (!drilldownDetails.length) return;
    const doc = new jsPDF();
    doc.text(`Attendance Detail: ${drilldownStudent?.name || ''}`, 14, 14);
    const headers = [["Date", "Roll No", "Name", "Status"]];
    const rows = drilldownDetails.map(d => [d.date, d.rollNo || '', d.name || '', d.status]);
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 20,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [80, 80, 200] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.raw[3] === 'absent') {
          data.cell.styles.textColor = [255, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    doc.save(`attendance-detail-${drilldownStudent?.name || ''}.pdf`);
  };

  // CSV export for summary
  const handleExportSummaryCSV = () => {
    if (!Array.isArray(attendanceSummary) || attendanceSummary.length === 0) {
      return;
    }
    const headers = ["Paper", "Section", "Name", "Total Classes", "Present Classes", "Attendance %"];
    const rows = attendanceSummary.map(row => [
      row.paper,
      row.section,
      row.name || '',
      row.totalClasses,
      row.presentClasses,
      row.attendancePercentage + "%"
    ]);
    downloadCSV(rows, headers, `attendance-summary-${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <main className="attendance">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Attendance Management
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        Teacher: {user.name} | Department: {user.department}
      </h3>
      {loading && papers.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading timetable...</p>
        </div>
      ) : (!Array.isArray(papers) || papers.length === 0) ? (
        <div className="text-center py-8">
          <FaClock className="mx-auto text-6xl text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">No Papers Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No papers or timetable has been found for your account.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              <strong>What to do:</strong> Contact the admin to:
            </p>
            <ul className="text-yellow-800 dark:text-yellow-200 text-sm mt-2 list-disc list-inside">
              <li>Assign papers to your account</li>
              <li>Generate your timetable using the Timetable Dashboard</li>
              <li>Ensure your staff profile is properly configured</li>
            </ul>
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-blue-800 dark:text-blue-200 text-xs">
                <strong>Note:</strong> The timetable-based attendance system requires a generated timetable. 
                Without it, you cannot mark attendance as the system doesn't know your class schedule.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-center">
            <button 
              onClick={fetchPapers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Retry Loading
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await axios.get('/attendance/timetable-papers/' + user._id, { timeout: 10000 });
                  console.log('Timetable test response:', res.data);
                } catch (err) {
                  console.error('Timetable test error:', err);
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Test Timetable
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
          📅 Timetable-Based Attendance System
        </h3>
        <p className="text-blue-700 dark:text-blue-300 mb-2">
          This system only shows dates when your subjects are actually scheduled according to the timetable. 
          No more confusion about which days to mark attendance!
        </p>
        <div className="text-sm text-blue-600 dark:text-blue-400">
          <strong>How it works:</strong> Select a paper and section to see only the dates when you have classes scheduled.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Paper *</label>
          <select 
            value={selectedPaper || ''} 
            onChange={e => {
              setSelectedPaper(e.target.value);
              setSelectedSection('');
              setDate('');
              setAvailableDates([]);
            }}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600" 
            required
          >
            <option value="">Select Paper</option>
            {papers.map(paper => (
              <option key={paper._id} value={paper._id}>
                {paper.paper} (Sem {paper.semester}) - {paper.scheduledDays?.join(', ') || 'No schedule'}
              </option>
            ))}
          </select>
        </div>
        
        {selectedPaper && (
          <div>
            <label className="block text-sm font-medium mb-1">Section *</label>
            <select 
              value={selectedSection || ''} 
              onChange={e => {
                setSelectedSection(e.target.value);
                setDate('');
              }}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600" 
              required
            >
              <option value="">Select Section</option>
              {(() => {
                const selectedPaperData = papers.find(p => p._id === selectedPaper);
                return selectedPaperData?.scheduledSections?.map(section => (
                  <option key={section} value={section}>{section}</option>
                )) || [];
              })()}
            </select>
          </div>
        )}
        
        {selectedPaper && selectedSection && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Scheduled Class Date * 
              {loadingDates && <span className="text-xs text-gray-500">(Loading...)</span>}
            </label>
            <select 
              value={date || ''} 
              onChange={e => {
                setDate(e.target.value);
                setAttendanceSaved(false); // Reset saved state when changing date
              }}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600" 
              required
              disabled={loadingDates || availableDates.length === 0}
            >
              <option value="">
                {loadingDates ? 'Loading dates...' : 
                 availableDates.length === 0 ? 'No scheduled classes' : 'Select Date'}
              </option>
              <optgroup label="Pending Attendance">
                {availableDates.filter(d => !d.hasAttendance).map(dateInfo => (
                  <option key={dateInfo.date} value={dateInfo.date}>
                    {dateInfo.date} ({dateInfo.dayName}) - Pending
                  </option>
                ))}
              </optgroup>
              <optgroup label="Completed Attendance">
                {availableDates.filter(d => d.hasAttendance).map(dateInfo => (
                  <option key={dateInfo.date} value={dateInfo.date}>
                    {dateInfo.date} ({dateInfo.dayName}) - ✓ Completed
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>

      {/* Timetable Info */}
      {timetableInfo && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📋 Timetable Information</h4>
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
              <span className="font-medium">Scheduled Days:</span> {timetableInfo.scheduledDays?.join(', ') || 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Semester Date Range Info */}
      {availableDates.length > 0 && (() => {
        const firstDate = availableDates[availableDates.length - 1]; // Oldest date
        const lastDate = availableDates[0]; // Newest date
        return (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">📅 Semester Date Range</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Attendance Period:</span> {firstDate?.date} to {lastDate?.date}
              </div>
              <div>
                <span className="font-medium">Total Class Days:</span> {availableDates.length} days
              </div>
            </div>
            <p className="text-purple-700 dark:text-purple-300 text-xs mt-2">
              ℹ️ Attendance can only be marked within the semester date range configured by your HOD.
            </p>
          </div>
        );
      })()}

      {/* Available Dates Statistics */}
      {selectedPaper && selectedSection && availableDates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📅 Available Class Dates
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{availableDates.length}</div>
              <div className="text-blue-800 dark:text-blue-200">Total Classes</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {availableDates.filter(d => !d.hasAttendance).length}
              </div>
              <div className="text-yellow-800 dark:text-yellow-200">Pending</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {availableDates.filter(d => d.hasAttendance).length}
              </div>
              <div className="text-green-800 dark:text-green-200">Completed</div>
            </div>
          </div>
        </div>
      )}

      {(selectedPaper && selectedSection && date) && (
        <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">
            Mark Attendance for {(() => {
              const selectedPaperData = papers.find(p => p._id === selectedPaper);
              const selectedDateData = availableDates.find(d => d.date === date);
              return `${selectedPaperData?.paper || 'Unknown Paper'} - Section ${selectedSection} on ${selectedDateData?.date} (${selectedDateData?.dayName})`;
            })()}
          </h3>
          
          {/* Show selected paper info */}
          {(() => {
            const selectedPaperData = papers.find(p => p._id === selectedPaper);
            return selectedPaperData ? (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                <p className="text-blue-800 dark:text-blue-200 font-medium">Paper Details:</p>
                <div className="text-blue-700 dark:text-blue-300 mt-1">
                  <strong>{selectedPaperData.paper}</strong> (Semester {selectedPaperData.semester}) - 
                  Scheduled on: {selectedPaperData.scheduledDays?.join(', ') || 'No schedule'}
                </div>
              </div>
            ) : null;
          })()}
          
          {/* Show date status */}
          {(() => {
            const selectedDateData = availableDates.find(d => d.date === date);
            return selectedDateData ? (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {selectedDateData.hasAttendance ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaClock className="text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {selectedDateData.date} ({selectedDateData.dayName})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {selectedDateData.hasAttendance ? 'Attendance Completed' : 'Attendance Pending'}
                  </div>
                </div>
              </div>
            ) : null;
          })()}
          
          {attendanceExists && (
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
              Attendance already exists for some papers in this section and date. You cannot submit again.
            </div>
          )}
          {loading ? (
            <div className="text-center py-4">Loading students...</div>
          ) : (
            <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleMarkAll('present')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">Mark All Present</button>
              <button onClick={() => handleMarkAll('absent')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">Mark All Absent</button>
            </div>
            <div className="overflow-x-auto">
              {/* Extra debug log for students */}
              {(() => { console.log('Rendering students table, students value:', students); return null; })()}
              <table className="w-full">
                <TableHeader headers={["Roll No", "Name", "Status", "Actions"]} />
                <tbody>
                  {/* Render fetched students */}
                  {Array.isArray(students) && students.length > 0 && students.map((student) => (
                    <tr key={student._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      attendanceSaved && student.status === 'absent' 
                        ? 'bg-red-50 dark:bg-red-900/20' 
                        : attendanceSaved && student.status === 'present'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : ''
                    }`}>
                      <td className="px-4 py-3 border">{student.rollNo}</td>
                      <td className="px-4 py-3 border font-medium">{student.name}</td>
                      <td className="px-4 py-3 border">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          attendanceSaved && student.status === 'present' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                            : attendanceSaved && student.status === 'absent'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {student.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStudentStatusChange(student._id, 'present')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              student.status === 'present'
                                ? 'bg-green-500 text-white shadow-md'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700 border border-green-300'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleStudentStatusChange(student._id, 'absent')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              student.status === 'absent'
                                ? 'bg-red-500 text-white shadow-md'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-700 border border-red-300'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Render manual students */}
                  {manualStudents.map((student, idx) => (
                    <tr key={student._id}>
                      <td className="px-4 py-2 border">
                        <input
                          type="text"
                          value={student.rollNo}
                          onChange={e => handleManualStudentChange(idx, 'rollNo', e.target.value)}
                          className="w-24 border rounded px-2 py-1"
                          placeholder="Roll No"
                        />
                      </td>
                      <td className="px-4 py-2 border">
                        <input
                          type="text"
                          value={student.name}
                          onChange={e => handleManualStudentChange(idx, 'name', e.target.value)}
                          className="w-32 border rounded px-2 py-1"
                          placeholder="Name"
                        />
                      </td>
                      <td className="px-4 py-2 border text-center">
                        <input
                          type="checkbox"
                          checked={student.status !== "absent"}
                          onChange={e => handleManualStudentChange(idx, 'status', e.target.checked ? 'present' : 'absent')}
                        />
                      </td>
                      <td className="px-4 py-2 border text-center">
                        <button onClick={() => handleRemoveManualStudent(idx)} className="text-red-600 font-bold">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {/* If no students at all, show message */}
                  {students.length === 0 && manualStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-red-600 font-semibold py-4">No students registered in this section. Add students below.</td>
                    </tr>
                  )}
                  </tbody>
                </table>
              <button onClick={handleAddManualStudent} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Add Student</button>
              </div>
              {students.length > 0 && (
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={handleSaveAttendance}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    disabled={saving || !selectedPaper || !selectedSection || !date}
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
                  <button onClick={handleExportCurrentPDF} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm">
                    <FaDownload />
                    <span>Export PDF</span>
                  </button>
              </div>
              )}
            </>
          )}
        </div>
      )}
        </>
      )}
      {/* Attendance Summary Section */}
      <section className="mt-10">
        <h3 className="text-2xl font-semibold mb-4">My Attendance Summary (Section-wise)</h3>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs">
            <strong>Debug Info:</strong> Papers: {papers.length}, Selected: {selectedPaperIds.length}, Summary: {attendanceSummary.length}
            <br />
            <strong>User:</strong> {user.name} (ID: {user._id}) | Department: {user.department}
            <br />
            <strong>Selected:</strong> Paper: {selectedPaper || 'None'}, Section: {selectedSection || 'None'}, Date: {date || 'None'}
          </div>
        )}
        <div className="flex gap-4 mb-4 items-center flex-wrap">
          <div className="flex flex-col">
            <label className="mb-1">Papers ({selectedPaperIds.length}/3 selected)</label>
            {selectedPaperIds.length >= 3 && (
              <div className="text-xs text-orange-600 mb-1">
                ⚠️ Maximum 3 papers for optimal performance
              </div>
            )}
            <div className="flex gap-2 items-center">
              <select
                multiple
                value={selectedPaperIds}
                onChange={e => {
                  const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                  if (options.length > 3) {
                    return;
                  }
                  setSelectedPaperIds(options);
                }}
                className="w-48 border rounded px-2 py-1 h-24"
              >
                {paperOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    const maxPapers = 3;
                    const paperIds = paperOptions.slice(0, maxPapers).map(p => p.value);
                    setSelectedPaperIds(paperIds);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedPaperIds([])}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
          <label>Section
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="ml-2 w-24 border rounded px-2 py-1"
            >
              <option value="">All</option>
              {uniqueSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          <label>Name
            <input
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              className="ml-2 w-32 border rounded px-2 py-1"
              placeholder="Search name"
            />
          </label>
          <label>Min %
            <input
              type="number"
              min="0"
              max="100"
              value={minPercent}
              onChange={e => setMinPercent(e.target.value)}
              className="ml-2 w-20 border rounded px-2 py-1"
              placeholder="Min"
            />
          </label>
          <label>Max %
            <input
              type="number"
              min="0"
              max="100"
              value={maxPercent}
              onChange={e => setMaxPercent(e.target.value)}
              className="ml-2 w-20 border rounded px-2 py-1"
              placeholder="Max"
            />
          </label>
          <label>Start Date
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="ml-2 w-32 border rounded px-2 py-1"
            />
          </label>
          <label>End Date
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="ml-2 w-32 border rounded px-2 py-1"
            />
          </label>
          <button onClick={handleExportSummaryCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaDownload />CSV</button>
          <button onClick={handleExportSummaryPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaDownload />PDF</button>
        </div>
        {selectedPaperIds.length === 0 ? (
          <div className="text-center py-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">Please select at least one paper to view attendance summary.</p>
          </div>
        ) : summaryLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading attendance summary...</p>
          </div>
        ) : Array.isArray(attendanceSummary) && attendanceSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-300 dark:border-slate-600">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Paper</th>
                  <th className="px-4 py-2 border">Section</th>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Total Classes</th>
                  <th className="px-4 py-2 border">Present Classes</th>
                  <th className="px-4 py-2 border">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSummary.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 border">{safe(row.paper)}</td>
                    <td className="px-4 py-2 border">{safe(row.section)}</td>
                    <td className="px-4 py-2 border">
                      <button
                        className="text-blue-700 underline"
                        onClick={() => openDrilldown(row.studentId, safe(row.name), selectedPaperIds[0], row.section)}
                      >
                        {safe(row.name)}
                      </button>
                    </td>
                    <td className="px-4 py-2 border">{safe(row.totalClasses)}</td>
                    <td className="px-4 py-2 border">{safe(row.presentClasses)}</td>
                    <td className={`px-4 py-2 border ${parseFloat(row.attendancePercentage) < 75 ? 'text-red-600 font-bold' : ''}`}>{safe(row.attendancePercentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No attendance records found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
              This could mean:
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-500 mt-2 list-disc list-inside space-y-1">
              <li>No attendance has been marked for the selected papers yet</li>
              <li>The selected filters are too restrictive</li>
              <li>No students are enrolled in the selected sections</li>
            </ul>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>To get started:</strong> Mark attendance for your classes using the form above, then return here to view the summary.
              </p>
            </div>
          </div>
        )}
      </section>
      {/* Drilldown Modal */}
      <Modal
        isOpen={drilldownModalOpen}
        onRequestClose={closeDrilldown}
        contentLabel="Student Attendance Detail"
        ariaHideApp={false}
        style={{ content: { maxWidth: 600, margin: 'auto' } }}
      >
        <>
          <h2 className="text-xl font-bold mb-2">Attendance Detail: {safe(drilldownStudent?.name || '')}</h2>
          {drilldownLoading ? (
            <div>Loading...</div>
          ) : drilldownDetails.length > 0 ? (
            <div>
              <table className="w-full border border-slate-300 mb-4">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Roll No</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownDetails.map((d, i) => (
                      <tr key={i} className={d.status === 'absent' ? 'text-red-600 font-bold' : ''}>
                        <td className="px-4 py-2 border">{safe(d.date)}</td>
                        <td className="px-4 py-2 border">{safe(d.rollNo)}</td>
                        <td className="px-4 py-2 border">{safe(d.name)}</td>
                        <td className="px-4 py-2 border">{safe(d.status)}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={handleExportDrilldownCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mr-2">Export CSV</button>
              <button onClick={handleExportDrilldownPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Export PDF</button>
            </div>
          ) : (
            <div>No attendance records found for this student.</div>
          )}
          <button onClick={closeDrilldown} className="mt-4 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">Close</button>
        </>
      </Modal>
    </main>
  );
};

export default Attendance;
