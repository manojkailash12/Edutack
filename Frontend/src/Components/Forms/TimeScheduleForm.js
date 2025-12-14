import { useState, useEffect, useRef, useContext } from "react";
import axios from "../../config/api/axios";
import Loading from "../Layouts/Loading";
import * as XLSX from "xlsx";
// import html2canvas from "html2canvas"; // Unused for now
import { jsPDF } from "jspdf";
import UserContext from "../../Hooks/UserContext";

// Define constants at module level to avoid hoisting issues
const DAYS = Object.freeze(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
const HOURS = Object.freeze(["1", "2", "3", "4"]);

// Time slots for display
const TIME_SLOTS = Object.freeze([
  "9:30 - 10:20",
  "10:20 - 11:10", 
  "1:20 - 2:10",
  "2:10 - 3:00"
]);

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
  const [showPrint, setShowPrint] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    if (!isHod) return;
    const fetchFields = async () => {
      try {
        const res = await axios.get("/time-schedule/debug/list-unique-paper-fields");
        setDepartments(res.data.departments || []);
        setSemesters(res.data.semesters || []);
        setYears(res.data.years || []);
      } catch (err) {
        setDepartments([]);
        setSemesters([]);
        setYears([]);
      }
    };
    fetchFields();
  }, [isHod]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!isHod) return;
    setLoading(true);
    setError("");
    setMessage("Initializing timetable generation...");
    setTimetable(null);
    setSummary([]);
    try {
      setMessage("Checking for existing timetable...");
      await axios.get(`/time-schedule/timetable/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(year)}`);
      
      setMessage("Generating new timetable... This may take up to 30 seconds.");
      const res = await axios.post(`/time-schedule/generate/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(year)}`, {}, {
        timeout: 30000 // 30 second timeout
      });
      
      // Enhanced message with coverage info
      let displayMessage = res.data.message;
      if (res.data.coveragePercentage) {
        displayMessage += ` (${res.data.coveragePercentage}% coverage)`;
      }
      if (res.data.warnings && res.data.warnings.length > 0) {
        displayMessage += `\n\nWarnings:\n${res.data.warnings.join('\n')}`;
      }
      if (res.data.skippedSlots && res.data.skippedSlots.length > 0) {
        displayMessage += `\n\nNote: ${res.data.skippedSlots.length} slots could not be optimally filled due to constraints.`;
      }
      
      setMessage(displayMessage);
      
      const viewRes2 = await axios.get(`/time-schedule/timetable/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(year)}`);
      setTimetable(viewRes2.data.timetable);
      const allSlots = [];
      Object.entries(viewRes2.data.timetable).forEach(([section, sectionGrid]) => {
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
      let errorMessage = err.response?.data?.message || err.message || "Error generating timetable";
      
      // Add more detailed error information if available
      if (err.response?.data?.paperDetails) {
        errorMessage += `\n\nPaper Details:\n${err.response.data.paperDetails.map(p => 
          `- ${p.paper}: Teacher=${p.teacherName || 'None'}, Approved=${p.teacherApproved}, Sections=${p.sections?.join(',') || 'None'}`
        ).join('\n')}`;
      }
      
      if (err.response?.data?.searchedFor) {
        errorMessage += `\n\nSearched for: ${JSON.stringify(err.response.data.searchedFor)}`;
      }
      
      setError(`${errorMessage} (Status: ${err.response?.status || 'Unknown'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!timetable) {
      alert("No timetable data available to export");
      return;
    }
    
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
      alert('Failed to generate Excel file: ' + error.message);
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 100);
  };

  const handleDownloadSimplePDF = () => {
    if (!timetable) {
      alert("No timetable data available to export");
      return;
    }

    try {
      // Simple PDF generation without complex formatting
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      doc.setFontSize(16);
      doc.text('EDUTRACK - Timetable', 20, 20);
      doc.setFontSize(12);
      doc.text(`${department} - ${semester} - ${year}`, 20, 30);
      
      let yPos = 50;
      
      Object.keys(timetable).forEach(section => {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`Section: ${section}`, 20, yPos);
        yPos += 10;
        
        // Simple table
        doc.setFontSize(8);
        doc.text('Day/Hour', 20, yPos);
        HOURS.forEach((hour, i) => {
          doc.text(`H${hour}`, 60 + (i * 40), yPos);
        });
        yPos += 8;
        
        DAYS.forEach(day => {
          doc.text(day, 20, yPos);
          HOURS.forEach((hour, i) => {
            const slot = timetable[section]?.[day]?.[hour];
            const text = slot?.paper?.paper || 'Free';
            doc.text(text.substring(0, 8), 60 + (i * 40), yPos);
          });
          yPos += 6;
        });
        
        yPos += 10;
      });
      
      doc.save(`Simple_Timetable_${department}_${semester}_${year}.pdf`);
    } catch (error) {
      alert('PDF generation failed. Please try Excel download instead.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!timetable) {
      alert("No timetable data available to export");
      return;
    }
    
    // Validate timetable structure
    const sectionKeys = Object.keys(timetable);
    if (sectionKeys.length === 0) {
      alert("Timetable is empty - no sections found");
      return;
    }
    

    
    try {
      // Initialize jsPDF with explicit configuration
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const sectionKeys = Object.keys(timetable);
      
      for (let sectionIndex = 0; sectionIndex < sectionKeys.length; sectionIndex++) {
        const section = sectionKeys[sectionIndex];
        
        if (sectionIndex > 0) {
          doc.addPage();
        }
        
        try {
          // Title
          doc.setFontSize(20);
          doc.setFont("helvetica", "bold");
          doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
          
          doc.setFontSize(16);
          doc.text(`Timetable - ${department} - ${semester} - ${year}`, pageWidth / 2, 35, { align: 'center' });
          
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(`Section: ${section}`, pageWidth / 2, 50, { align: 'center' });
          
          // Table setup
          const startY = 65;
          const rowHeight = 18;
          const margin = 15;
          const tableWidth = pageWidth - (2 * margin);
          
          // Column widths - optimized for landscape with 4 hours
          const timeColWidth = 35;
          const dayColWidth = (tableWidth - timeColWidth) / DAYS.length;
          
          // Draw table header
          doc.setFillColor(63, 81, 181);
          doc.rect(margin, startY, tableWidth, rowHeight, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          
          // Header - Time column
          doc.text("Time Slot", margin + timeColWidth/2, startY + 12, { align: 'center' });
          
          // Header - Day columns
          DAYS.forEach((day, index) => {
            const x = margin + timeColWidth + (index * dayColWidth);
            doc.text(day, x + dayColWidth/2, startY + 12, { align: 'center' });
          });
          
          // Draw header borders
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          
          // Vertical lines in header
          for (let i = 0; i <= DAYS.length; i++) {
            const x = margin + timeColWidth + (i * dayColWidth);
            doc.line(x, startY, x, startY + rowHeight);
          }
          doc.line(margin + timeColWidth, startY, margin + timeColWidth, startY + rowHeight);
          
          // Table data rows
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          
          HOURS.forEach((hour, hourIndex) => {
            const y = startY + (hourIndex + 1) * rowHeight;
            
            // Alternating row colors
            if (hourIndex % 2 === 0) {
              doc.setFillColor(248, 249, 250);
              doc.rect(margin, y, tableWidth, rowHeight, 'F');
            }
            
            // Time slot column
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(`Hour ${hour}`, margin + timeColWidth/2, y + 8, { align: 'center' });
            doc.setFontSize(7);
            const timeSlot = TIME_SLOTS[hourIndex] || `Hour ${hour}`;
            doc.text(timeSlot, margin + timeColWidth/2, y + 14, { align: 'center' });
            
            // Day columns
            DAYS.forEach((day, dayIndex) => {
              const x = margin + timeColWidth + (dayIndex * dayColWidth);
              
              // Safe access to slot data with multiple fallback patterns
              let slot = null;
              try {
                slot = timetable[section]?.[day]?.[hour] || 
                       timetable[section]?.[day]?.[`hour${hour}`] ||
                       timetable[section]?.[day]?.[parseInt(hour)];
              } catch (e) {
                // Silently handle data access errors
              }
              
              if (slot && (slot.paper || slot.subject)) {
                try {
                  // Subject name (bold)
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(8);
                  const subjectText = (slot.paper?.paper || slot.subject || slot.paper || 'N/A').toString();
                  
                  // Smart text wrapping for long subject names
                  const maxLength = 12;
                  const lines = [];
                  if (subjectText.length > maxLength) {
                    const words = subjectText.split(' ');
                    let currentLine = '';
                    words.forEach(word => {
                      if ((currentLine + word).length <= maxLength) {
                        currentLine += (currentLine ? ' ' : '') + word;
                      } else {
                        if (currentLine) lines.push(currentLine);
                        currentLine = word;
                      }
                    });
                    if (currentLine) lines.push(currentLine);
                  } else {
                    lines.push(subjectText);
                  }
                  
                  // Display subject lines
                  lines.forEach((line, lineIndex) => {
                    doc.text(line, x + 2, y + 6 + (lineIndex * 4));
                  });
                  
                  // Teacher name (normal, smaller)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  const teacherText = (slot.teacher?.name || slot.teacherName || slot.teacher || 'N/A').toString();
                  const teacherDisplay = teacherText.length > 15 ? teacherText.substring(0, 15) + '...' : teacherText;
                  doc.text(`T: ${teacherDisplay}`, x + 2, y + 6 + (lines.length * 4) + 2);
                } catch (cellError) {
                  // Fallback to simple text
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7);
                  doc.text('Error', x + 2, y + 8);
                }
              } else {
                // Empty slot
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Free', x + dayColWidth/2, y + 10, { align: 'center' });
                doc.setTextColor(0, 0, 0);
              }
            });
            
            // Draw row borders
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            
            // Horizontal line
            doc.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
            
            // Vertical lines
            for (let i = 0; i <= DAYS.length; i++) {
              const x = margin + timeColWidth + (i * dayColWidth);
              doc.line(x, y, x, y + rowHeight);
            }
            doc.line(margin + timeColWidth, y, margin + timeColWidth, y + rowHeight);
          });
          
          // Outer table border
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.8);
          doc.rect(margin, startY, tableWidth, (HOURS.length + 1) * rowHeight);
          
          // Left border for time column
          doc.line(margin + timeColWidth, startY, margin + timeColWidth, startY + (HOURS.length + 1) * rowHeight);
          
        } catch (sectionError) {
          // Continue with next section
        }
      }
      
      const fileName = `Timetable_${department}_${semester}_${year}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      let errorMessage = "Failed to generate PDF";
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      // Offer alternative download options
      const useAlternative = window.confirm(`${errorMessage}\n\nWould you like to download as Excel instead?`);
      if (useAlternative) {
        handleDownload(); // Download as Excel
      }
    }
  };

  if (!isHod) {
    return <main className="p-4"><div className="text-red-600">Not authorized. HOD only.</div></main>;
  }

  return (
    <main className={showPrint ? "print:bg-white" : "p-4"}>
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
            <button type="button" onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg ml-2">Print View</button>
            <button type="button" onClick={handleDownloadPDF} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg ml-2">Download PDF</button>
            <button type="button" onClick={handleDownloadSimplePDF} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg ml-2">Simple PDF</button>
          </>
        )}
      </form>
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loading />
          <span className="ml-2 text-blue-600">Generating timetable... Please wait up to 30 seconds.</span>
        </div>
      )}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {message && (
        <div className="text-green-700 mb-4 whitespace-pre-line bg-green-50 p-3 rounded-lg border border-green-200">
          {message}
        </div>
      )}
      {summary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Assignment Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-400 dark:border-slate-600 text-xs">
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
        <div className={showPrint ? "print:bg-white" : "overflow-x-auto"}>
          <h3 className="mb-2 text-xl font-semibold">Generated Timetable</h3>
          {Object.keys(timetable).map(section => (
            <div key={section} className="mb-6" ref={el => (sectionRefs.current[section] = el)}>
              <h4 className="font-bold text-violet-800 dark:text-violet-300">Section: {section}</h4>
              <table className="min-w-full border border-slate-400 dark:border-slate-600 mb-2 text-xs">
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
                                <div className="text-xs text-gray-600 dark:text-gray-300"><b>Teacher: {slot.teacher?.name}</b></div>
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