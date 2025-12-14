import { useState, useEffect, useContext, useCallback } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { FaDownload } from "react-icons/fa";

import Loading from "../Layouts/Loading";
import jsPDF from "jspdf";

const AttendanceStudent = () => {
  const { user } = useContext(UserContext);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalClasses: 0,
    presentClasses: 0,
    absentClasses: 0,
    attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allSubjectDetails, setAllSubjectDetails] = useState({});

  // Helper function to calculate attendance percentage from details
  const calculateAttendancePercentage = (details) => {
    if (!details || details.length === 0) return 0;
    const presentCount = details.filter(d => d.status === 'present').length;
    const totalCount = details.length;
    return Math.round((presentCount / totalCount) * 100);
  };
  // Fetch student attendance summary and all subject details
  const fetchAttendanceSummary = useCallback(async () => {
    if (!user._id) return;
    
    setLoading(true);
    try {
      // Get overall attendance percentage
      const overallResponse = await axios.get(`/attendance/percentage/${user._id}`);
      setOverallStats(overallResponse.data);

      // Get subject-wise attendance summary (only subjects with attendance records)
      const summaryResponse = await axios.get(`/attendance/student-summary/${user._id}`);
      const subjectsWithAttendance = summaryResponse.data || [];
      


      // Get all papers for the student's section/department/year to show complete list
      let allSubjects = [...subjectsWithAttendance];
      
      try {
        const studentContentResponse = await axios.get(`/attendance/student-content/${user.section}`, {
          params: {
            department: user.department,
            year: user.year
          }
        });
        
        const allPapers = studentContentResponse.data.papers || [];

        
        // Merge enrolled papers with attendance data
        allPapers.forEach(paper => {
          const existingSubject = subjectsWithAttendance.find(s => s._id === paper._id);
          if (!existingSubject) {
            // Add subjects with no attendance records yet
            allSubjects.push({
              _id: paper._id,
              paper: paper.paper,
              percentage: 0,
              teacher: paper.teacher
            });
          }
        });
        

      } catch (contentErr) {
        console.error('Error fetching student content:', contentErr);
        // Fall back to just subjects with attendance if student-content fails
      }

      // Fetch detailed attendance for all subjects
      const detailsPromises = allSubjects.map(async (subject) => {
        try {
          const response = await axios.get(`/attendance/student-detail`, {
            params: {
              studentId: user._id,
              paperId: subject._id,
              section: user.section
            }
          });
          return {
            subjectId: subject._id,
            details: response.data.details || []
          };
        } catch (err) {
          console.error(`Error fetching details for subject ${subject.paper}:`, err);
          return {
            subjectId: subject._id,
            details: []
          };
        }
      });

      const allDetails = await Promise.all(detailsPromises);
      const detailsMap = {};
      allDetails.forEach(({ subjectId, details }) => {
        detailsMap[subjectId] = details;
      });

      setAllSubjectDetails(detailsMap);
      
      // Calculate percentages for all subjects based on their attendance details
      const updatedSubjects = allSubjects.map(subject => {
        const details = detailsMap[subject._id] || [];
        const calculatedPercentage = calculateAttendancePercentage(details);
        
        // Use calculated percentage if we have details, otherwise keep the original percentage
        return {
          ...subject,
          percentage: details.length > 0 ? calculatedPercentage : subject.percentage
        };
      });
      
      setAttendanceSummary(updatedSubjects);
      
      setError("");
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError("Error fetching attendance data");
      setAttendanceSummary([]);
      setAllSubjectDetails({});
      setOverallStats({
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        attendancePercentage: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user._id, user.section, user.department, user.year]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendanceSummary();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [fetchAttendanceSummary]);


  // Generate PDF for specific subject with proper table borders
  const generateSubjectPDF = (subject) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`Attendance Report - ${subject.paper || 'Subject'}`, 14, 20);
      
      // Student information
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Student: ${user.name || 'N/A'}`, 14, 30);
      doc.text(`Roll No: ${user.rollNo || 'N/A'}`, 14, 38);
      doc.text(`Section: ${user.section || 'N/A'}`, 14, 46);
      doc.text(`Attendance: ${subject.percentage || 0}%`, 14, 54);
      
      // Get subject details from allSubjectDetails
      const details = allSubjectDetails[subject._id] || [];
      
      if (details.length > 0) {
        // Table with proper borders
        let yPosition = 75;
        const tableStartY = yPosition;
        const rowHeight = 10;
        const tableWidth = 166; // Total table width
        
        // Draw table header with background and borders
        doc.setFillColor(240, 240, 240); // Light gray background
        doc.rect(14, yPosition - 8, tableWidth, 12, 'F'); // Increased header height
        
        // Header text - properly positioned in larger header cell
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Date', 16, yPosition - 1);
        doc.text('Status', 82, yPosition - 1);
        
        // Header borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(14, yPosition - 8, tableWidth, 12); // Outer border with increased height
        doc.line(80, yPosition - 8, 80, yPosition + 4); // Column separator
        
        yPosition += 4;
        
        // Table rows with borders
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        const sortedDetails = details.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedDetails.forEach((detail, index) => {
          if (yPosition > 270) { // Start new page if needed
            doc.addPage();
            yPosition = 20;
            
            // Repeat header on new page
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPosition - 8, tableWidth, 12, 'F');
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Date', 16, yPosition - 1);
            doc.text('Status', 82, yPosition - 1);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1);
            doc.rect(14, yPosition - 8, tableWidth, 12);
            doc.line(80, yPosition - 8, 80, yPosition + 4);
            yPosition += 4;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
          }
          
          const dateStr = new Date(detail.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          const statusStr = detail.status === 'present' ? 'Present' : 'Absent';
          
          // Row background (alternating colors)
          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250); // Very light gray for even rows
            doc.rect(14, yPosition - 6, tableWidth, rowHeight, 'F');
          }
          
          // Row text with color coding for status - centered in cells
          doc.setTextColor(0, 0, 0); // Default black
          doc.text(dateStr, 16, yPosition - 1);
          
          // Color code the status
          if (detail.status === 'present') {
            doc.setTextColor(0, 128, 0); // Green for present
          } else {
            doc.setTextColor(255, 0, 0); // Red for absent
          }
          doc.text(statusStr, 82, yPosition - 1);
          doc.setTextColor(0, 0, 0); // Reset to black
          
          // Row borders
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.rect(14, yPosition - 6, tableWidth, rowHeight); // Outer border
          doc.line(80, yPosition - 6, 80, yPosition + 4); // Column separator
          
          yPosition += rowHeight;
        });
        
        // Final table border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        const tableEndY = yPosition - rowHeight + 4;
        doc.rect(14, tableStartY - 6, tableWidth, tableEndY - (tableStartY - 6));
        
      } else {
        doc.setFontSize(12);
        doc.text('No attendance records found for this subject.', 14, 75);
      }
      
      // Generate filename
      const cleanSubjectName = (subject.paper || 'subject').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const fileName = `${cleanSubjectName}_attendance.pdf`;
      
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating subject PDF:', error);
    }
  };

  // Generate overall PDF with proper table borders
  const generateOverallPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Complete Attendance Report', 14, 20);
      
      // Student information
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Student: ${user.name || 'N/A'}`, 14, 30);
      doc.text(`Roll No: ${user.rollNo || 'N/A'}`, 14, 38);
      doc.text(`Section: ${user.section || 'N/A'}`, 14, 46);
      doc.text(`Overall Attendance: ${overallStats.attendancePercentage || 0}%`, 14, 54);
      
      // Overall stats summary
      doc.setFontSize(10);
      doc.text(`Total Classes: ${overallStats.totalClasses || 0}`, 14, 62);
      doc.text(`Present: ${overallStats.presentClasses || 0}`, 80, 62);
      doc.text(`Absent: ${overallStats.absentClasses || 0}`, 130, 62);
      
      if (attendanceSummary.length > 0) {
        // Table with proper borders
        let yPosition = 80;
        const tableStartY = yPosition;
        const rowHeight = 10;
        const tableWidth = 166; // Total table width (from x=14 to x=180)
        
        // Draw table header with background and borders
        doc.setFillColor(240, 240, 240); // Light gray background
        doc.rect(14, yPosition - 8, tableWidth, 12, 'F'); // Increased header height
        
        // Header text - properly positioned in larger header cell
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Subject', 16, yPosition - 1);
        doc.text('Attendance %', 120, yPosition - 1);
        
        // Header borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(14, yPosition - 8, tableWidth, 12); // Outer border with increased height
        doc.line(115, yPosition - 8, 115, yPosition + 4); // Column separator
        
        yPosition += 4;
        
        // Table rows with borders
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        attendanceSummary.forEach((subject, index) => {
          if (yPosition > 270) { // Start new page if needed
            doc.addPage();
            yPosition = 20;
            
            // Repeat header on new page
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPosition - 8, tableWidth, 12, 'F');
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Subject', 16, yPosition - 1);
            doc.text('Attendance %', 120, yPosition - 1);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1);
            doc.rect(14, yPosition - 8, tableWidth, 12);
            doc.line(115, yPosition - 8, 115, yPosition + 4);
            yPosition += 4;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
          }
          
          const subjectName = (subject.paper || 'Unknown Subject').substring(0, 35); // Limit length
          const percentage = `${subject.percentage || 0}%`;
          
          // Row background (alternating colors)
          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250); // Very light gray for even rows
            doc.rect(14, yPosition - 6, tableWidth, rowHeight, 'F');
          }
          
          // Row text - centered in cells
          doc.text(subjectName, 16, yPosition - 1);
          doc.text(percentage, 120, yPosition - 1);
          
          // Row borders
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.rect(14, yPosition - 6, tableWidth, rowHeight); // Outer border
          doc.line(115, yPosition - 6, 115, yPosition + 4); // Column separator moved left
          
          yPosition += rowHeight;
        });
        
        // Final table border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        const tableEndY = yPosition - rowHeight + 4;
        doc.rect(14, tableStartY - 6, tableWidth, tableEndY - (tableStartY - 6));
        
      } else {
        doc.setFontSize(12);
        doc.text('No subject attendance data available.', 14, 85);
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `attendance_report_${user.rollNo || 'student'}_${timestamp}.pdf`;
      
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating overall PDF:', error);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                📊 My Attendance
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {user.name}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm4-3a1 1 0 00-1 1v1h2V4a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {user.rollNo}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Section {user.section}
                </span>
              </div>
            </div>
            <button
              onClick={generateOverallPDF}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <FaDownload className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Compact Overall Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-0 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Overall Attendance
                </h2>
                <div className="text-blue-100 text-sm mt-1">
                  {overallStats.presentClasses} present out of {overallStats.totalClasses} classes
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {overallStats.attendancePercentage}%
                </div>
                <div className={`text-sm ${
                  overallStats.attendancePercentage >= 75 ? 'text-green-200' : 'text-red-200'
                }`}>
                  {overallStats.attendancePercentage >= 75 ? '✓ Good' : '⚠ Low'}
                </div>
              </div>
            </div>
          </div>

          {/* Compact Stats Grid */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {overallStats.totalClasses}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {overallStats.presentClasses}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {overallStats.absentClasses}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
              </div>
            </div>
          </div>
        </div>

        {/* All Subjects - Single Page View */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              All Subjects Attendance
            </h2>
            <button
              onClick={fetchAttendanceSummary}
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {attendanceSummary.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Subject Data Available</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Overall attendance: {overallStats.attendancePercentage}% ({overallStats.presentClasses}/{overallStats.totalClasses} classes)
              </p>
              <button
                onClick={fetchAttendanceSummary}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Try Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {attendanceSummary.map((subject, index) => {
                const subjectDetails = allSubjectDetails[subject._id] || [];
                const presentCount = subjectDetails.filter(d => d.status === 'present').length;
                const absentCount = subjectDetails.filter(d => d.status === 'absent').length;
                const totalCount = subjectDetails.length;
                
                return (
                  <div
                    key={subject._id || index}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
                  >
                    {/* Compact Subject Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold">
                            {subject.paper}
                          </h3>
                          <div className="text-blue-100 text-sm">
                            {totalCount > 0 ? `${presentCount}P • ${absentCount}A • ${totalCount} Total` : 'No records yet'}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {subject.percentage}%
                            </div>
                          </div>
                          <button
                            onClick={() => generateSubjectPDF(subject)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          >
                            <FaDownload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Details */}
                    <div className="p-4">
                      {subjectDetails.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No attendance records for <strong>{subject.paper}</strong>
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Attendance History ({totalCount} classes)
                          </h4>
                          
                          {/* Attendance Table */}
                          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl overflow-hidden">
                            <div className="max-h-60 overflow-y-auto">
                              <table className="w-full">
                                <thead className="bg-gray-100 dark:bg-gray-600 sticky top-0">
                                  <tr>
                                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white text-sm">
                                      Date
                                    </th>
                                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white text-sm">
                                      Day
                                    </th>
                                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white text-sm">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subjectDetails
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map((detail, idx) => (
                                      <tr 
                                        key={idx}
                                        className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600/30 transition-colors"
                                      >
                                        <td className="py-2 px-3 text-gray-900 dark:text-gray-100 text-sm">
                                          {new Date(detail.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </td>
                                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">
                                          {new Date(detail.date).toLocaleDateString('en-US', {
                                            weekday: 'short'
                                          })}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                                            detail.status === 'present'
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                          }`}>
                                            {detail.status === 'present' ? (
                                              <>
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Present
                                              </>
                                            ) : (
                                              <>
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Absent
                                              </>
                                            )}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Compact Stats */}
                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {presentCount}
                              </div>
                              <div className="text-xs text-green-700 dark:text-green-300">Present</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                {absentCount}
                              </div>
                              <div className="text-xs text-red-700 dark:text-red-300">Absent</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                              <div className={`text-lg font-bold ${
                                subject.percentage >= 75 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {subject.percentage}%
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-300">Percentage</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStudent;
