import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import Loading from "../Layouts/Loading";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import UserContext from "../../Hooks/UserContext";
import { toast } from 'react-toastify';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = ["1", "2", "3", "4"];

const getColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return `#${"00000".substring(0, 6 - c.length)}${c}`;
};

const TimeScheduleForm = () => {
  const { user } = useContext(UserContext);
  const isHod = !!user && user.role === "HOD";

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState("");
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    if (!isHod) return;
    const fetchFields = async () => {
      try {
        const res = await axios.get("/time-schedule/debug/list-unique-paper-fields");
        setDepartments(res.data.departments || []);
        setSemesters(res.data.semesters || []);
        setYears(res.data.years || []);
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(`Failed to load form data: ${err.message}`);
      }
    };
    fetchFields();
  }, [isHod]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!isHod) return;
    setLoading(true);
    setError("");
    setMessage("Generating timetable...");
    setTimetable(null);
    setSummary([]);
    
    try {
      const res = await axios.post(`/time-schedule/generate/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(year)}`, {}, {
        timeout: 30000
      });
      
      setMessage(res.data.message);
      
      const viewRes = await axios.get(`/time-schedule/timetable/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(year)}`);
      setTimetable(viewRes.data.timetable);
      
      const allSlots = [];
      Object.entries(viewRes.data.timetable).forEach(([section, sectionGrid]) => {
        DAYS.forEach(day => {
          HOURS.forEach(hour => {
            const slot = sectionGrid[day][hour];
            if (slot) {
              allSlots.push({
                section,
                day,
                hour,
                paper: slot.paper?.paper,
                teacher: slot.teacher?.name,
              });
            }
          });
        });
      });
      setSummary(allSlots);
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error generating timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!timetable) return;
    
    try {
      const wb = XLSX.utils.book_new();
      Object.keys(timetable).forEach(section => {
        const wsData = [["Day/Hour", ...HOURS]];
        DAYS.forEach(day => {
          wsData.push([
            day,
            ...HOURS.map(hour => {
              const slot = timetable[section]?.[day]?.[hour];
              return slot ? `${slot.paper?.paper || ""} (${slot.teacher?.name || "-"})` : "-";
            })
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, section);
      });
      XLSX.writeFile(wb, `Timetable_${department}_${semester}_${year}.xlsx`);
    } catch (error) {
      toast.error('Failed to generate Excel file: ' + error.message);
    }
  };

  const handleDownloadPDF = () => {
    if (!timetable) {
      toast.error("No timetable data available to export");
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const sectionKeys = Object.keys(timetable);
      
      for (let sectionIndex = 0; sectionIndex < sectionKeys.length; sectionIndex++) {
        const section = sectionKeys[sectionIndex];
        
        if (sectionIndex > 0) {
          doc.addPage();
        }
        
        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("EDUTRACK - Timetable", pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(`${department} - ${semester} - ${year}`, pageWidth / 2, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Section: ${section}`, pageWidth / 2, 40, { align: 'center' });
        
        // Table setup
        const startY = 55;
        const rowHeight = 15;
        const margin = 20;
        const tableWidth = pageWidth - (2 * margin);
        
        // Column widths
        const timeColWidth = 40;
        const dayColWidth = (tableWidth - timeColWidth) / DAYS.length;
        
        // Draw table header
        doc.setFillColor(70, 130, 180);
        doc.rect(margin, startY, tableWidth, rowHeight, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        
        // Header - Time column
        doc.text("Time/Day", margin + timeColWidth/2, startY + 10, { align: 'center' });
        
        // Header - Day columns
        DAYS.forEach((day, index) => {
          const x = margin + timeColWidth + (index * dayColWidth);
          doc.text(day, x + dayColWidth/2, startY + 10, { align: 'center' });
        });
        
        // Table data rows
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        
        HOURS.forEach((hour, hourIndex) => {
          const y = startY + (hourIndex + 1) * rowHeight;
          
          // Alternating row colors
          if (hourIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, tableWidth, rowHeight, 'F');
          }
          
          // Time slot column
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(`Hour ${hour}`, margin + timeColWidth/2, y + 6, { align: 'center' });
          doc.setFontSize(7);
          doc.text(`9:30-10:20`, margin + timeColWidth/2, y + 11, { align: 'center' });
          
          // Day columns
          DAYS.forEach((day, dayIndex) => {
            const x = margin + timeColWidth + (dayIndex * dayColWidth);
            
            const slot = timetable[section]?.[day]?.[hour];
            
            if (slot && slot.paper) {
              // Subject name
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              const subjectText = (slot.paper?.paper || 'N/A').toString();
              const shortSubject = subjectText.length > 10 ? subjectText.substring(0, 10) + '...' : subjectText;
              doc.text(shortSubject, x + dayColWidth/2, y + 6, { align: 'center' });
              
              // Teacher name
              doc.setFont("helvetica", "normal");
              doc.setFontSize(6);
              const teacherText = (slot.teacher?.name || 'N/A').toString();
              const shortTeacher = teacherText.length > 12 ? teacherText.substring(0, 12) + '...' : teacherText;
              doc.text(shortTeacher, x + dayColWidth/2, y + 11, { align: 'center' });
            } else {
              // Empty slot
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('Free', x + dayColWidth/2, y + 8, { align: 'center' });
              doc.setTextColor(0, 0, 0);
            }
          });
        });
        
        // Draw table borders
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        
        // Outer border
        doc.rect(margin, startY, tableWidth, (HOURS.length + 1) * rowHeight);
        
        // Horizontal lines
        for (let i = 0; i <= HOURS.length; i++) {
          const y = startY + i * rowHeight;
          doc.line(margin, y, margin + tableWidth, y);
        }
        
        // Vertical lines
        for (let i = 0; i <= DAYS.length; i++) {
          const x = margin + timeColWidth + (i * dayColWidth);
          doc.line(x, startY, x, startY + (HOURS.length + 1) * rowHeight);
        }
        
        // Time column separator
        doc.line(margin + timeColWidth, startY, margin + timeColWidth, startY + (HOURS.length + 1) * rowHeight);
      }
      
      doc.save(`Timetable_${department}_${semester}_${year}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation failed. Please try Excel download instead.');
    }
  };

  if (!user) {
    return (
      <main className="p-4">
        <div className="flex justify-center items-center h-64">
          <Loading />
          <span className="ml-4">Loading user data...</span>
        </div>
      </main>
    );
  }

  if (!isHod) {
    return <main className="p-4"><div className="text-red-600">Not authorized. HOD only.</div></main>;
  }

  return (
    <main className="p-4">
      <h2 className="mb-4 text-3xl font-bold text-violet-900 dark:text-slate-200">Generate Complete Timetable (HOD)</h2>
      
      <form className="mb-6 flex flex-wrap gap-4 items-end" onSubmit={handleGenerate}>
        <div>
          <label className="block mb-1 font-medium">Department</label>
          <select value={department} onChange={e => setDepartment(e.target.value)} className="p-2 border rounded" required>
            <option value="">Select Department</option>
            {departments.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="p-2 border rounded" required>
            <option value="">Select Semester</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Year</label>
          <select value={year} onChange={e => setYear(e.target.value)} className="p-2 border rounded" required>
            <option value="">Select Year</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Generate Timetable</button>
        {timetable && (
          <>
            <button type="button" onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg ml-2">Download Excel</button>
            <button type="button" onClick={handleDownloadPDF} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg ml-2">Download PDF</button>
          </>
        )}
      </form>
      
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loading />
          <span className="ml-2 text-blue-600">Generating timetable...</span>
        </div>
      )}
      
      {error && <div className="text-red-600 mb-4">{error}</div>}
      
      {message && (
        <div className="text-green-700 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
          {message}
        </div>
      )}
      
      {summary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Assignment Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-400 text-xs">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Section</th>
                  <th className="border px-2 py-1">Day</th>
                  <th className="border px-2 py-1">Hour</th>
                  <th className="border px-2 py-1">Paper</th>
                  <th className="border px-2 py-1">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{row.section}</td>
                    <td className="border px-2 py-1">{row.day}</td>
                    <td className="border px-2 py-1">{row.hour}</td>
                    <td className="border px-2 py-1">{row.paper}</td>
                    <td className="border px-2 py-1">{row.teacher}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {timetable && (
        <div className="overflow-x-auto">
          <h3 className="mb-2 text-xl font-semibold">Generated Timetable</h3>
          {Object.keys(timetable).map(section => (
            <div key={section} className="mb-6">
              <h4 className="font-bold text-violet-800">Section: {section}</h4>
              <table className="min-w-full border border-slate-400 mb-2 text-xs">
                <thead>
                  <tr>
                    <th className="border border-slate-400 px-2 py-1">Day/Hour</th>
                    {HOURS.map(hour => (
                      <th key={hour} className="border border-slate-400 px-2 py-1">{hour}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day}>
                      <td className="border border-slate-400 px-2 py-1 font-semibold">{day}</td>
                      {HOURS.map(hour => {
                        const slot = timetable[section]?.[day]?.[hour];
                        const color = slot && slot.paper ? getColor(slot.paper.paper) : undefined;
                        return (
                          <td key={hour} className="border border-slate-400 px-2 py-1 text-xs" style={color ? { background: color + '22' } : {}}>
                            {slot ? (
                              <div>
                                <div className="font-medium" style={color ? { color, fontWeight: 'bold' } : { fontWeight: 'bold' }}>{slot.paper?.paper}</div>
                                <div className="text-xs text-gray-600"><b>Teacher: {slot.teacher?.name}</b></div>
                              </div>
                            ) : (
                              <span className="text-red-400 font-bold">Unassigned</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default TimeScheduleForm;