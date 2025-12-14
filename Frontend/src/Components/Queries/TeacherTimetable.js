import { useContext, useState, useEffect, useCallback } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import { toast } from "react-toastify";
import { FaDownload, FaCalendarAlt, FaFilePdf } from "react-icons/fa";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = ["1", "2", "3", "4"];

const TeacherTimetable = () => {
  const { user } = useContext(UserContext);
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [availableSemesters, setAvailableSemesters] = useState([]);

  const loadTimetableForSemester = useCallback(async (semester, existingSchedules = null) => {
    try {
      let schedules;
      if (existingSchedules) {
        schedules = existingSchedules.filter(s => s.semester === semester);
      } else {
        const res = await axios.get(`/time-schedule/teacher/${user._id}`, {
          timeout: 10000 // 10 second timeout
        });
        schedules = res.data.filter(s => s.semester === semester);
      }
      
      // Build grid
      const grid = {};
      days.forEach(day => {
        grid[day] = {};
        hours.forEach(hour => {
          grid[day][hour] = null;
        });
      });
      
      schedules.forEach(slot => {
        if (grid[slot.day] && grid[slot.day][slot.hour]) return;
        if (grid[slot.day]) grid[slot.day][slot.hour] = slot;
      });
      
      setTimetableData({ semester, grid });
    } catch (err) {
      console.error('Error loading timetable:', err);
      setError("Error loading timetable view");
    }
  }, [user._id]);

  const fetchSemestersAndYears = useCallback(async () => {
    if (!user._id) return;
    
    setLoading(true);
    setError("");
    
    try {
      console.log('Fetching timetable for teacher:', user._id);
      
      // Fetch all time schedules for this teacher with timeout
      const res = await axios.get(`/time-schedule/teacher/${user._id}`, {
        timeout: 15000 // 15 second timeout
      });
      
      const schedules = res.data || [];
      console.log('Received schedules:', schedules.length);
      
      // Extract unique semesters and years
      const semesters = Array.from(new Set(schedules.map(s => s.semester))).filter(Boolean);
      setAvailableSemesters(semesters);
      
      // If there's only one semester, auto-select it and load the timetable
      if (semesters.length === 1) {
        setSelectedSemester(semesters[0]);
        await loadTimetableForSemester(semesters[0], schedules);
      } else if (semesters.length === 0) {
        setError("No timetable data found for this teacher");
      }
    } catch (err) {
      console.error('Error fetching teacher timetable:', err);
      
      let errorMessage = "Failed to load teacher timetable";
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.response?.status === 404) {
        errorMessage = "No timetable found for this teacher";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [user._id, loadTimetableForSemester]);

  useEffect(() => {
    fetchSemestersAndYears();
  }, [fetchSemestersAndYears]);

  const viewTimetable = async () => {
    if (!selectedSemester) {
      toast.error("Please select semester to view timetable");
      return;
    }
    setLoading(true);
    setError("");
    
    try {
      await loadTimetableForSemester(selectedSemester);
    } finally {
      setLoading(false);
    }
  };

  const downloadTimetable = () => {
    if (!timetableData) return;
    const wb = XLSX.utils.book_new();
    days.forEach(day => {
      const wsData = [["Hour", ...hours]];
      for (let hour of hours) {
        const slot = timetableData.grid[day][hour];
        wsData.push([
          hour,
          slot ? `${slot.paper?.paper || ""} (Sec: ${slot.section || "-"})` : "-"
        ]);
      }
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, day);
    });
    XLSX.writeFile(wb, `Teacher_Timetable_${user.name}_${timetableData.semester}.xlsx`);
    toast.success("Timetable downloaded successfully!");
  };

  const downloadTimetablePDF = () => {
    if (!timetableData) {
      toast.error("No timetable data available to export");
      return;
    }
    
    try {
      console.log("Starting teacher timetable PDF generation...");
      
      // Initialize jsPDF with explicit configuration
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      console.log(`Page dimensions: ${pageWidth} x ${pageHeight}`);
      
      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`Timetable - ${timetableData.semester}`, pageWidth / 2, 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Teacher: ${user.name || 'Unknown'}`, pageWidth / 2, 45, { align: 'center' });
      
      // Time slots definition - 4 hours with lunch break
      const timeSlots = [
        "9:30 - 10:20",  // Morning 1st hour
        "10:20 - 11:10", // Morning 2nd hour
        "1:20 - 2:10",   // Afternoon 1st hour (after lunch break 12:20-1:20)
        "2:10 - 3:00"    // Afternoon 2nd hour
      ];
      
      // Table setup
      const startY = 60;
      const rowHeight = 15;
      const margin = 15;
      const tableWidth = pageWidth - (2 * margin);
      
      // Column widths - optimized for landscape
      const timeColWidth = 35;
      const dayColWidth = (tableWidth - timeColWidth) / days.length;
      
      // Draw table header
      doc.setFillColor(63, 81, 181); // Blue background
      doc.rect(margin, startY, tableWidth, rowHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      
      // Header - Time column
      doc.text("Time Slot", margin + 5, startY + 10);
      
      // Header - Day columns
      days.forEach((day, index) => {
        const x = margin + timeColWidth + (index * dayColWidth);
        doc.text(day, x + dayColWidth/2, startY + 10, { align: 'center' });
      });
      
      // Draw header borders
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      // Vertical lines in header
      for (let i = 0; i <= days.length; i++) {
        const x = margin + timeColWidth + (i * dayColWidth);
        doc.line(x, startY, x, startY + rowHeight);
      }
      doc.line(margin + timeColWidth, startY, margin + timeColWidth, startY + rowHeight);
      
      // Table data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      hours.forEach((hour, hourIndex) => {
        const y = startY + (hourIndex + 1) * rowHeight;
        
        // Alternating row colors
        if (hourIndex % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(margin, y, tableWidth, rowHeight, 'F');
        }
        
        // Time slot column
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(`${hour}`, margin + 5, y + 6);
        doc.text(timeSlots[hourIndex] || '', margin + 5, y + 12);
        
        // Day columns
        days.forEach((day, dayIndex) => {
          const x = margin + timeColWidth + (dayIndex * dayColWidth);
          const slot = timetableData.grid && timetableData.grid[day] && timetableData.grid[day][hour];
          
          if (slot) {
            // Subject name (bold)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            const subjectText = (slot.paper?.paper || 'N/A').toString();
            // Truncate if too long
            const maxLength = 15;
            const displayText = subjectText.length > maxLength ? 
              subjectText.substring(0, maxLength) + '...' : subjectText;
            doc.text(displayText, x + 2, y + 6);
            
            // Section (normal)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(`Sec: ${slot.section || '-'}`, x + 2, y + 10);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('-', x + dayColWidth/2, y + 9, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        });
        
        // Draw row borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        
        // Horizontal line
        doc.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
        
        // Vertical lines
        for (let i = 0; i <= days.length; i++) {
          const x = margin + timeColWidth + (i * dayColWidth);
          doc.line(x, y, x, y + rowHeight);
        }
        doc.line(margin + timeColWidth, y, margin + timeColWidth, y + rowHeight);
      });
      
      // Outer table border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, startY, tableWidth, (hours.length + 1) * rowHeight);
      
      // Left border for time column
      doc.line(margin + timeColWidth, startY, margin + timeColWidth, startY + (hours.length + 1) * rowHeight);
      
      const fileName = `Timetable_${(user.name || 'Teacher').replace(/[^a-zA-Z0-9]/g, '_')}_${timetableData.semester}_${new Date().toISOString().slice(0,10)}.pdf`;
      console.log(`Saving teacher PDF as: ${fileName}`);
      
      doc.save(fileName);
      toast.success("Timetable PDF downloaded successfully!");
      console.log("Teacher PDF generation completed successfully");
      
    } catch (error) {
      console.error("PDF Export Error:", error);
      console.error("Error stack:", error.stack);
      
      let errorMessage = "Failed to generate PDF";
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading timetable...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error Loading Timetable</h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={() => {
              setError("");
              fetchSemestersAndYears();
            }}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="teacher-timetable p-4">
      <h2 className="mb-4 text-3xl font-bold text-violet-900 dark:text-slate-200 flex items-center gap-2">
        <FaCalendarAlt /> My Timetable
      </h2>
      <div className="mb-4 flex gap-4 items-center">
        <select
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Select Semester</option>
          {availableSemesters.map(sem => (
            <option key={sem} value={sem}>{sem}</option>
          ))}
        </select>
        <button
          onClick={viewTimetable}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          View Timetable
        </button>
        {timetableData && (
          <div className="flex gap-2">
            <button
              onClick={downloadTimetable}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaDownload /> Excel
            </button>
            <button
              onClick={downloadTimetablePDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaFilePdf /> PDF
            </button>
          </div>
        )}
      </div>
      {timetableData && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-slate-400 dark:border-slate-600">
            <thead>
              <tr>
                <th className="border border-slate-400 px-2 py-1">Hour</th>
                {days.map(day => (
                  <th key={day} className="border border-slate-400 px-2 py-1">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour => (
                <tr key={hour}>
                  <td className="border border-slate-400 px-2 py-1 font-semibold">{hour}</td>
                  {days.map(day => {
                    const slot = timetableData.grid[day][hour];
                    return (
                      <td key={day} className="border border-slate-400 px-2 py-1 text-sm">
                        {slot ? (
                          <div>
                            <div className="font-medium">{slot.paper?.paper}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">Section: {slot.section}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default TeacherTimetable; 