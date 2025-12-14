import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import { FaDownload, FaUsers, FaChalkboardTeacher, FaBook, FaChartBar, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import * as XLSX from 'xlsx';
import jsPDF from "jspdf";
import 'jspdf-autotable';

// Utility function to sort students by roll number
function sortByRollNumber(students) {
  return students.sort((a, b) => {
    const rollA = a.rollNo || "";
    const rollB = b.rollNo || "";
    
    // Extract numeric part from roll number for proper sorting
    const numA = parseInt(rollA.replace(/\D/g, '')) || 0;
    const numB = parseInt(rollB.replace(/\D/g, '')) || 0;
    
    return numA - numB;
  });
}

// Utility for PDF export of attendance report
function exportAttendanceReportPDF(attendanceData, department) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // EDUTRACK Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
  
  // Sort attendance data by roll number
  const sortedAttendanceData = sortByRollNumber([...attendanceData]);
  
  const headers = [["S.No", "Roll Number", "Student Name", "Section", "Total Classes", "Present", "Attendance %"]];
  const rows = sortedAttendanceData.map((r, index) => [
    (index + 1).toString(),
    r.rollNo || "N/A",
    r.studentName || "N/A",
    r.section || "N/A",
    (r.totalClasses || 0).toString(),
    (r.presentClasses || 0).toString(),
    `${r.attendancePercentage || 0}%`
  ]);
  
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 25,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 25 }
    },
    theme: 'grid'
  });
  
  const fileName = `Attendance_Report_${department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}



// Utility for PDF export of teachers list
// eslint-disable-next-line no-unused-vars
function exportTeachersListPDF(teachersData, department) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // EDUTRACK Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
  
  const headers = [["S.No", "Teacher Name", "Username"]];
  const rows = teachersData.map((teacher, index) => [
    (index + 1).toString(),
    teacher.name || "N/A",
    teacher.username || "N/A"
  ]);
  
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 25,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'left', cellWidth: 65 }
    },
    theme: 'grid'
  });
  
  const fileName = `Teachers_${department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}

// Utility for PDF export of papers list
function exportPapersListPDF(papersData, department) {
  console.log('Generating PDF for papers:', papersData.length, 'papers');
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // EDUTRACK Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
  
  const headers = [["S.No", "Paper", "Semester", "Year", "Sections", "Teacher", "Students"]];
  const rows = papersData.map((paper, index) => {
    // Ensure all values are strings and handle null/undefined
    return [
      (index + 1).toString(),
      String(paper.paper || "N/A"),
      String(paper.semester || "N/A"),
      String(paper.year || "N/A"),
      Array.isArray(paper.sections) ? paper.sections.join(", ") : "N/A",
      String(paper.teacher?.name || "Not Assigned"),
      String(paper.students?.length || 0)
    ];
  });
  
  try {
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 25,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        }
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 30 },
        5: { halign: 'left', cellWidth: 35 },
        6: { halign: 'center', cellWidth: 20 }
      },
      theme: 'grid'
    });
  } catch (tableError) {
    console.error('AutoTable error:', tableError);
    throw new Error(`Table generation failed: ${tableError.message}`);
  }
  
  const fileName = `Papers_${department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}

// Utility for PDF export of internal marks
function exportInternalMarksPDF(marksData, department) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  
  // EDUTRACK Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EDUTRACK", pageWidth / 2, 20, { align: 'center' });
  
  // Sort internal marks data by roll number
  const sortedMarksData = sortByRollNumber([...marksData]);
  
  const headers = [["S.No", "Roll Number", "Student Name", "Section", "Paper", "Semester", "Total Marks"]];
  const rows = sortedMarksData.map((record, index) => [
    (index + 1).toString(),
    record.rollNo || "N/A",
    record.studentName || "N/A",
    record.section || "N/A",
    record.paperName || "N/A",
    record.semester || "N/A",
    (record.total || 0).toString()
  ]);
  
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 25,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'left', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 25 }
    },
    theme: 'grid'
  });
  
  const fileName = `Internal_Marks_${department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}

const HODDashboard = () => {
  const { user } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attendancePaper, setAttendancePaper] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceSection, setAttendanceSection] = useState("");
  const [attendanceYear, setAttendanceYear] = useState("");
  const [attendanceSemester, setAttendanceSemester] = useState("");
  const [attendanceTeacher, setAttendanceTeacher] = useState("");
  const [filteredAttendance, setFilteredAttendance] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!dashboardData) setLoading(true); // Only show loading on first load
        setError("");
        
        const [dashboardResponse, summaryResponse] = await Promise.all([
          axios.get(`/staff/hod-dashboard/${encodeURIComponent(user.department)}`),
          axios.get(`/staff/hod-summary/${encodeURIComponent(user.department)}`)
        ]);
        
        setDashboardData(dashboardResponse.data);
        setSummaryData(summaryResponse.data);
        
        // Fetch assignments and quizzes for all papers in the department
        if (dashboardResponse.data?.papers) {
          const allAssignments = [];
          const allQuizzes = [];
          
          for (const paper of dashboardResponse.data.papers) {
            try {
              const [assignmentRes, quizRes] = await Promise.all([
                axios.get(`/assignments/${paper._id}`).catch(() => ({ data: [] })),
                axios.get(`/quizzes/${paper._id}`).catch(() => ({ data: [] }))
              ]);
              
              const assignments = (assignmentRes.data || []).map(a => ({ ...a, paperName: paper.paper }));
              console.log(`Assignments for paper ${paper.paper}:`, assignments.map(a => ({ id: a._id, question: a.question })));
              allAssignments.push(...assignments);
              allQuizzes.push(...(quizRes.data || []).map(q => ({ ...q, paperName: paper.paper })));
            } catch (err) {
              console.error(`Error fetching data for paper ${paper.paper}:`, err);
            }
          }
          
          setAssignments(allAssignments);
          setQuizzes(allQuizzes);
        }
      } catch (err) {
        console.error('HOD Dashboard Error:', err);
        setError(err.response?.data?.message || err.message || "Error fetching dashboard data");
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "HOD" && user.department) {
      fetchDashboardData();
      
      // Set up auto-refresh every 15 seconds
      const interval = setInterval(fetchDashboardData, 15000);
      return () => clearInterval(interval);
    } else if (user) {
      setLoading(false);
    }
  }, [user, dashboardData]);

  // Fetch paper-wise attendance when paper filter changes
  useEffect(() => {
    const fetchPaperAttendance = async () => {
      if (!attendancePaper) {
        setFilteredAttendance(dashboardData?.attendanceData || []);
        return;
      }
      try {
        const res = await axios.get(`/attendance/paper-report/${attendancePaper}`);
        setFilteredAttendance(res.data.attendanceReport || []);
      } catch (err) {
        setFilteredAttendance([]);
      }
    };
    if (activeTab === "attendance") {
      fetchPaperAttendance();
    }
  }, [attendancePaper, dashboardData, activeTab]);

  // Filter by date, section, year, semester, teacher
  useEffect(() => {
    let data = attendancePaper ? filteredAttendance : (dashboardData?.attendanceData || []);
    if (attendanceDate) {
      data = data.filter(r => r.date === attendanceDate);
    }
    if (attendanceSection) {
      data = data.filter(r => r.section === attendanceSection);
    }
    if (attendanceYear) {
      data = data.filter(r => r.year?.toString() === attendanceYear);
    }
    if (attendanceSemester) {
      data = data.filter(r => r.semester?.toString() === attendanceSemester);
    }
    if (attendanceTeacher) {
      data = data.filter(r => r.teacherName === attendanceTeacher);
    }
    // Only update if changed to avoid loops when filteredAttendance is in deps
    const same = Array.isArray(filteredAttendance) && Array.isArray(data) && filteredAttendance.length === data.length && filteredAttendance.every((v, i) => v === data[i]);
    if (!same) setFilteredAttendance(data);
  }, [attendanceDate, attendanceSection, attendanceYear, attendanceSemester, attendanceTeacher, attendancePaper, dashboardData, filteredAttendance]);

  // Reset filters when switching tab
  useEffect(() => {
    if (activeTab === "attendance") {
      setAttendancePaper("");
      setAttendanceDate("");
      setAttendanceSection("");
      setAttendanceYear("");
      setAttendanceSemester("");
      setAttendanceTeacher("");
      setFilteredAttendance(dashboardData?.attendanceData || []);
    }
  }, [activeTab, dashboardData]);

  const downloadExcel = (data, filename) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success(`${filename} downloaded successfully!`);
    } catch (err) {
      toast.error("Error downloading file");
    }
  };

  const downloadStudentsList = () => {
    if (!dashboardData?.students) {
      toast.error("No students data available");
      return;
    }
    
    // Sort students by roll number before exporting
    const sortedStudents = sortByRollNumber([...dashboardData.students]);
    const studentsData = sortedStudents.map((student, index) => ({
      "S.No": index + 1,
      "Roll No": student.rollNo || "N/A",
      "Name": student.name || "N/A",
      "Section": student.section || "N/A",
      "Year": student.year || "N/A"
    }));
    
    downloadExcel(studentsData, `Students_List_${user.department}`);
  };

  const downloadStudentsListPDF = () => {
    if (!dashboardData?.students || dashboardData.students.length === 0) {
      toast.error("No students data available");
      return;
    }
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // EDUTRACK Title (Large, Bold, Centered)
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("EDUTRACK", pageWidth / 2, 25, { align: 'center' });
      
      // Students List Title (Medium, Bold, Centered)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Students List", pageWidth / 2, 40, { align: 'center' });
      
      // Department and info
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Department: ${user.department}`, pageWidth / 2, 55, { align: 'center' });
      
      // Remove generated line as requested
      
      // Sort students by roll number
      const sortedStudents = sortByRollNumber([...dashboardData.students]);
      
      // Table setup - Optimized for A4 portrait with proper margins
      const startY = 70;
      const rowHeight = 14; // Increased for better spacing
      const margin = 15;
      // const tableWidth = pageWidth - (2 * margin); // Total available width - unused
      
      // Optimized column widths that fit within A4 portrait (210mm)
      const colWidths = [15, 30, 90, 25, 20]; // Total: 180mm (increased name column)
      const colPositions = [margin]; // Starting positions
      
      // Calculate column positions
      for (let i = 1; i < colWidths.length; i++) {
        colPositions[i] = colPositions[i-1] + colWidths[i-1];
      }
      
      const totalTableWidth = colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1] - margin;
      
      // Table Headers (Bold, with blue background)
      doc.setFillColor(63, 81, 181);
      doc.rect(margin, startY - 8, totalTableWidth, rowHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const headers = ["S.No", "Roll Number", "Student Name", "Section", "Year"];
      headers.forEach((header, i) => {
        // Center headers in their columns
        const headerX = colPositions[i] + (colWidths[i] / 2);
        doc.text(header, headerX, startY - 2, { align: 'center' });
      });
      
      // Draw vertical lines for header
      doc.setDrawColor(255, 255, 255); // White lines on blue background
      doc.setLineWidth(0.5);
      colPositions.forEach((pos, i) => {
        if (i > 0) {
          doc.line(pos, startY - 8, pos, startY + 4);
        }
      });
      // Right border for header
      const tableRightEdge = colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1];
      doc.line(tableRightEdge, startY - 8, tableRightEdge, startY + 4);
      
      // Table Data Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      let currentPageRows = 0;
      const maxRowsPerPage = Math.floor((pageHeight - startY - 20) / rowHeight);
      
      sortedStudents.forEach((student, index) => {
        const yPos = startY + (currentPageRows + 1) * rowHeight;
        
        // Check if we need a new page
        if (currentPageRows >= maxRowsPerPage) {
          doc.addPage();
          currentPageRows = 0;
          
          // Repeat headers on new page
          doc.setFillColor(63, 81, 181);
          doc.rect(margin, 30, totalTableWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          headers.forEach((header, i) => {
            const headerX = colPositions[i] + (colWidths[i] / 2);
            doc.text(header, headerX, 36, { align: 'center' });
          });
          
          // Header borders for new page
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          colPositions.forEach((pos, i) => {
            if (i > 0) {
              doc.line(pos, 30, pos, 30 + rowHeight);
            }
          });
          doc.line(tableRightEdge, 30, tableRightEdge, 30 + rowHeight);
          
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }
        
        const currentY = currentPageRows === 0 && index >= maxRowsPerPage ? 30 + rowHeight + (currentPageRows * rowHeight) : yPos;
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(margin, currentY - 8, totalTableWidth, rowHeight, 'F');
        }
        
        // Row data with proper text handling
        const rowData = [
          (index + 1).toString(),
          student.rollNo || "N/A",
          student.name || "N/A",
          student.section || "N/A",
          student.year || "N/A"
        ];
        
        rowData.forEach((data, i) => {
          // Center align S.No, Section, Year; left align others
          const align = (i === 0 || i === 3 || i === 4) ? 'center' : 'left';
          const xPos = align === 'center' ? colPositions[i] + (colWidths[i] / 2) : colPositions[i] + 3;
          doc.text(data, xPos, currentY - 2, { align: align });
        });
        
        // Draw complete grid lines
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        
        // Horizontal row border
        doc.line(margin, currentY + 4, tableRightEdge, currentY + 4);
        
        // Vertical column lines for each row
        colPositions.forEach((pos, i) => {
          if (i > 0) {
            const startYPos = index === 0 ? startY - 8 : currentY - 8;
            doc.line(pos, startYPos, pos, currentY + 4);
          }
        });
        // Right border
        const startYPos = index === 0 ? startY - 8 : currentY - 8;
        doc.line(tableRightEdge, startYPos, tableRightEdge, currentY + 4);
        
        currentPageRows++;
      });
      
      // Final table border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      
      // Outer table border
      const finalRowCount = Math.min(currentPageRows, maxRowsPerPage);
      const finalTableHeight = (finalRowCount + 1) * rowHeight;
      
      // Left border
      doc.line(margin, startY - 8, margin, startY - 8 + finalTableHeight);
      // Top border
      doc.line(margin, startY - 8, tableRightEdge, startY - 8);
      // Right border
      doc.line(tableRightEdge, startY - 8, tableRightEdge, startY - 8 + finalTableHeight);
      // Bottom border
      doc.line(margin, startY - 8 + finalTableHeight, tableRightEdge, startY - 8 + finalTableHeight);
      
      const fileName = `Students_${user.department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      toast.success("Students list PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  };

  const downloadTeachersList = () => {
    if (!dashboardData?.teachers) {
      toast.error("No teachers data available");
      return;
    }
    
    const teachersData = dashboardData.teachers.map((teacher, index) => ({
      "S.No": index + 1,
      "Name": teacher.name || "N/A",
      "Username": teacher.username || "N/A"
    }));
    
    downloadExcel(teachersData, `Teachers_List_${user.department}`);
  };

  const downloadTeachersListPDF = () => {
    if (!dashboardData?.teachers || dashboardData.teachers.length === 0) {
      toast.error("No teachers data available");
      return;
    }
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // EDUTRACK Title (Large, Bold, Centered)
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("EDUTRACK", pageWidth / 2, 25, { align: 'center' });
      
      // Teachers List Title (Medium, Bold, Centered)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Teachers List", pageWidth / 2, 40, { align: 'center' });
      
      // Department and info
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Department: ${user.department}`, pageWidth / 2, 55, { align: 'center' });
      
      // Table setup
      const startY = 70;
      const rowHeight = 12;
      const colWidths = [25, 80, 80]; // S.No, Name, Username
      const colPositions = [20];
      
      // Calculate column positions
      for (let i = 1; i < colWidths.length; i++) {
        colPositions[i] = colPositions[i-1] + colWidths[i-1];
      }
      
      // Table Headers (Bold, with blue background)
      doc.setFillColor(63, 81, 181);
      doc.rect(20, startY - 8, pageWidth - 40, rowHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const headers = ["S.No", "Teacher Name", "Username"];
      headers.forEach((header, i) => {
        doc.text(header, colPositions[i] + 5, startY - 2);
      });
      
      // Draw vertical lines for header
      doc.setDrawColor(255, 255, 255);
      colPositions.forEach((pos, i) => {
        if (i > 0) {
          doc.line(pos, startY - 8, pos, startY + 4);
        }
      });
      doc.line(pageWidth - 20, startY - 8, pageWidth - 20, startY + 4);
      
      // Table Data Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      dashboardData.teachers.forEach((teacher, index) => {
        const yPos = startY + (index + 1) * rowHeight;
        
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
          doc.addPage();
          // Repeat headers on new page
          doc.setFillColor(63, 81, 181);
          doc.rect(20, 30, pageWidth - 40, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          headers.forEach((header, i) => {
            doc.text(header, colPositions[i] + 5, 38);
          });
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        }
        
        const currentY = yPos > pageHeight - 30 ? 42 + ((index % 25) * rowHeight) : yPos;
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, currentY - 8, pageWidth - 40, rowHeight, 'F');
        }
        
        // Row data
        const rowData = [
          (index + 1).toString(),
          teacher.name || "N/A",
          teacher.username || "N/A"
        ];
        
        rowData.forEach((data, i) => {
          const align = i === 0 ? 'center' : 'left';
          const xPos = align === 'center' ? colPositions[i] + (colWidths[i] / 2) : colPositions[i] + 5;
          doc.text(data, xPos, currentY - 2, { align: align });
        });
        
        // Draw horizontal row border
        doc.setDrawColor(200, 200, 200);
        doc.line(20, currentY + 4, pageWidth - 20, currentY + 4);
        
        // Draw vertical column lines
        colPositions.forEach((pos, i) => {
          if (i > 0) {
            doc.line(pos, startY - 8, pos, currentY + 4);
          }
        });
        doc.line(pageWidth - 20, startY - 8, pageWidth - 20, currentY + 4);
      });
      
      // Table border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(20, startY - 8, pageWidth - 40, (Math.min(dashboardData.teachers.length, 25) + 1) * rowHeight);
      
      const fileName = `Teachers_${user.department.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      toast.success("Teachers list PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  };

  const downloadPapersList = () => {
    if (!dashboardData?.papers) {
      toast.error("No papers data available");
      return;
    }
    
    const papersData = dashboardData.papers.map((paper, index) => ({
      "S.No": index + 1,
      "Paper": paper.paper || "N/A",
      "Semester": paper.semester || "N/A",
      "Year": paper.year || "N/A",
      "Sections": paper.sections?.join(", ") || "N/A",
      "Teacher": paper.teacher?.name || "Not Assigned",
      "Students Count": paper.students?.length || 0
    }));
    
    downloadExcel(papersData, `Papers_List_${user.department}`);
  };

  const downloadPapersListPDF = () => {
    if (!dashboardData?.papers) {
      toast.error("No papers data available");
      return;
    }
    
    try {
      exportPapersListPDF(dashboardData.papers, user.department);
      toast.success("Papers list PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  const downloadAttendanceReport = () => {
    if (!filteredAttendance.length) {
      toast.error("No attendance data available");
      return;
    }
    
    // Sort attendance data by roll number before exporting
    const sortedAttendance = sortByRollNumber([...filteredAttendance]);
    const attendanceData = sortedAttendance.map((record, index) => ({
      "S.No": index + 1,
      "Roll No": record.rollNo || "N/A",
      "Name": record.studentName || "N/A",
      "Section": record.section || "N/A",
      "Total Classes": record.totalClasses || 0,
      "Present Classes": record.presentClasses || 0,
      "Attendance %": `${record.attendancePercentage || 0}%`
    }));
    
    downloadExcel(attendanceData, `Attendance_Report_${user.department}`);
  };

  const downloadInternalMarksReport = () => {
    if (!dashboardData?.internalMarks) {
      toast.error("No internal marks data available");
      return;
    }
    
    // Sort internal marks data by roll number before exporting
    const sortedMarks = sortByRollNumber([...dashboardData.internalMarks]);
    const marksData = sortedMarks.map((record, index) => ({
      "S.No": index + 1,
      "Roll No": record.rollNo || "N/A",
      "Name": record.studentName || "N/A",
      "Section": record.section || "N/A",
      "Paper": record.paperName || "N/A",
      "Semester": record.semester || "N/A",
      "Test": record.test || 0,
      "Seminar": record.seminar || 0,
      "Assignment": record.assignment || 0,
      "Attendance": record.attendance || 0,
      "Total": record.total || 0
    }));
    
    downloadExcel(marksData, `Internal_Marks_Report_${user.department}`);
  };

  const downloadInternalMarksReportPDF = () => {
    if (!dashboardData?.internalMarks) {
      toast.error("No internal marks data available");
      return;
    }
    
    try {
      exportInternalMarksPDF(dashboardData.internalMarks, user.department);
      toast.success("Internal marks PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      await axios.delete(`/assignments/${assignmentId}`);
      setAssignments(prev => prev.filter(a => a._id !== assignmentId));
      toast.success('Assignment deleted successfully');
    } catch (err) {
      toast.error('Error deleting assignment');
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await axios.delete(`/quizzes/${quizId}`);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      toast.success('Quiz deleted successfully');
    } catch (err) {
      toast.error('Error deleting quiz');
    }
  };

  // PDF export handler for attendance
  const handleAttendancePDFExport = () => {
    if (!filteredAttendance.length) {
      toast.error("No attendance data available");
      return;
    }
    
    try {
      exportAttendanceReportPDF(filteredAttendance, user.department);
      toast.success("Attendance report PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  // Show loading while user context is loading
  if (!user) {
    return <Loading />;
  }

  if (user.role !== "HOD") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD can access this dashboard.</p>
      </div>
    );
  }

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Use filteredAttendance for table and export
  const attendanceTableData = filteredAttendance;

  return (
    <main className="hod-dashboard">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        HOD Dashboard
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        Department: {user.department}
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-violet-100 dark:bg-violet-900/20 p-6 rounded-lg border border-violet-300 dark:border-violet-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Total Teachers</p>
              <p className="text-3xl font-bold text-violet-900 dark:text-violet-100">{summaryData?.totalTeachers || 0}</p>
            </div>
            <FaChalkboardTeacher className="text-3xl text-violet-600 dark:text-violet-400" />
          </div>
        </div>

        <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Students</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{summaryData?.totalStudents || 0}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-lg border border-green-300 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Papers</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{summaryData?.totalPapers || 0}</p>
            </div>
            <FaBook className="text-3xl text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-orange-100 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-300 dark:border-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Attendance</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{summaryData?.averageAttendance || 0}%</p>
            </div>
            <FaChartBar className="text-3xl text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "summary", label: "Summary", icon: FaChartBar },
            { id: "students", label: "Students", icon: FaUsers },
            { id: "teachers", label: "Teachers", icon: FaChalkboardTeacher },
            { id: "papers", label: "Papers", icon: FaBook },
            { id: "assignments", label: "Assignments", icon: FaBook },
            { id: "quizzes", label: "Quizzes", icon: FaBook },
            { id: "attendance", label: "Attendance", icon: FaChartBar },
            { id: "internal", label: "Internal Marks", icon: FaEye }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {activeTab === "summary" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Department Summary</h3>
            </div>
            
            {summaryData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Section-wise Student Distribution</h4>
                  <div className="space-y-2">
                    {summaryData.sectionStats?.map((section) => (
                      <div key={section._id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded">
                        <span className="font-medium">{section._id}</span>
                        <span className="text-violet-600 dark:text-violet-400">{section.count} students</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Semester-wise Paper Distribution</h4>
                  <div className="space-y-2">
                    {summaryData.semesterStats?.map((semester) => (
                      <div key={semester._id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded">
                        <span className="font-medium">Semester {semester._id}</span>
                        <span className="text-green-600 dark:text-green-400">{semester.count} papers</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Students List ({dashboardData?.students?.length || 0})</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadStudentsList}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadStudentsListPDF}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Year</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData?.students && sortByRollNumber([...dashboardData.students]).map((student, index) => (
                    <tr key={student._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.rollNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {student.section}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{student.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "teachers" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Teachers List ({dashboardData?.teachers?.length || 0})</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadTeachersList}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadTeachersListPDF}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData?.teachers?.map((teacher, index) => (
                    <tr key={teacher._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{teacher.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{teacher.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "papers" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Papers List ({dashboardData?.papers?.length || 0})</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadPapersList}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadPapersListPDF}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paper</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sections</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Students</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData?.papers?.map((paper, index) => (
                    <tr key={paper._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{paper.paper}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{paper.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{paper.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {paper.sections?.map((section) => (
                            <span key={section} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                              {section}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{paper.teacher?.name || "Not Assigned"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{paper.students?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Attendance Report ({attendanceTableData.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadAttendanceReport}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleAttendancePDFExport}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
              <select value={attendancePaper} onChange={e => setAttendancePaper(e.target.value)} className="p-2 border rounded">
                <option value="">All Papers</option>
                {dashboardData?.papers?.map(p => <option key={p._id} value={p._id}>{p.paper}</option>)}
              </select>
              <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-2 border rounded" />
              <select value={attendanceSection} onChange={e => setAttendanceSection(e.target.value)} className="p-2 border rounded">
                <option value="">All Sections</option>
                {dashboardData?.students && Array.from(new Set(dashboardData.students.map(s => s.section))).map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
              <select value={attendanceYear} onChange={e => setAttendanceYear(e.target.value)} className="p-2 border rounded">
                <option value="">All Years</option>
                {dashboardData?.students && Array.from(new Set(dashboardData.students.map(s => s.year))).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={attendanceSemester} onChange={e => setAttendanceSemester(e.target.value)} className="p-2 border rounded">
                <option value="">All Semesters</option>
                {dashboardData?.papers && Array.from(new Set(dashboardData.papers.map(p => p.semester))).map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
              <select value={attendanceTeacher} onChange={e => setAttendanceTeacher(e.target.value)} className="p-2 border rounded">
                <option value="">All Teachers</option>
                {dashboardData?.teachers && Array.from(new Set(dashboardData.teachers.map(t => t.name))).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Classes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceTableData && sortByRollNumber([...attendanceTableData]).map((record, index) => (
                    <tr key={record.studentId || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.rollNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.studentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {record.section}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.totalClasses}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.presentClasses}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.attendancePercentage >= 75 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                            : record.attendancePercentage >= 60
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        }`}>
                          {record.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assignments ({assignments.length})</h3>
              <Link
                to="/dash/assignments/add-assignment"
                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
              >
                <span>Create Assignment</span>
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paper</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Deadline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Submissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {assignments.map((assignment, index) => (
                    <tr key={assignment._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {assignment.question?.length > 50 ? `${assignment.question.substring(0, 50)}...` : assignment.question}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{assignment.paperName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {assignment.section}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(assignment.deadline).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {assignment.submissions?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {assignment._id && (
                            <>
                              <Link
                                to={`/dash/assignments/${assignment._id}/edit`}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit Assignment"
                              >
                                <FaEdit />
                              </Link>
                              <Link
                                to={`/dash/submissions/assignment/${assignment._id}`}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="View Submissions"
                              >
                                <FaEye />
                              </Link>
                              <button
                                onClick={() => deleteAssignment(assignment._id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Assignment"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {!assignment._id && (
                            <span className="text-gray-500 text-sm">Invalid assignment</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quizzes ({quizzes.length})</h3>
              <Link
                to="/dash/quizzes/add-quiz"
                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
              >
                <span>Create Quiz</span>
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paper</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Submissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {quizzes.map((quiz, index) => {
                    const now = new Date();
                    const startTime = new Date(quiz.startTime);
                    const endTime = new Date(quiz.endTime);
                    let status = 'upcoming';
                    if (now >= startTime && now <= endTime) status = 'active';
                    if (now > endTime) status = 'ended';
                    
                    return (
                      <tr key={quiz._id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {quiz.title?.length > 30 ? `${quiz.title.substring(0, 30)}...` : quiz.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{quiz.paperName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                            {quiz.section}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {quiz.duration} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status === 'active' ? 'bg-green-100 text-green-800' :
                            status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {quiz.submissions?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {quiz._id && (
                              <>
                                <Link
                                  to={`/dash/quizzes/${quiz._id}/edit`}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Edit Quiz"
                                >
                                  <FaEdit />
                                </Link>
                                <Link
                                  to={`/dash/submissions/quiz/${quiz._id}`}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  title="View Submissions"
                                >
                                  <FaEye />
                                </Link>
                                <button
                                  onClick={() => deleteQuiz(quiz._id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete Quiz"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                            {!quiz._id && (
                              <span className="text-gray-500 text-sm">Invalid quiz</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "internal" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Internal Marks Report ({dashboardData?.internalMarks?.length || 0})</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadInternalMarksReport}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>Excel</span>
                </button>
                <button
                  onClick={downloadInternalMarksReportPDF}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                >
                  <FaDownload />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paper</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData?.internalMarks && sortByRollNumber([...dashboardData.internalMarks]).map((record, index) => (
                    <tr key={`${record.studentId}-${record.paperName}-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.rollNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.studentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {record.section}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.paperName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default HODDashboard; 