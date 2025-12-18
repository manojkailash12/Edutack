import { useContext, useState, useEffect, useCallback } from "react";
import UserContext from "../../Hooks/UserContext";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import InstantLoader from "../Layouts/InstantLoader";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useInstantData } from "../../Hooks/useInstantData";
import { apiService } from "../../services/apiService";

const ViewAttendance = () => {
  const { user } = useContext(UserContext);
  const { data: attendanceResponse, loading, error } = useInstantData('attendance');
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [departmentCache, setDepartmentCache] = useState(new Map());

  useEffect(() => {
    if (attendanceResponse) {
      console.log('=== ATTENDANCE RESPONSE DEBUG ===');
      console.log('Full response:', attendanceResponse);
      console.log('Attendance report:', attendanceResponse.attendanceReport);
      console.log('Report length:', attendanceResponse.attendanceReport?.length);
      setAttendanceData(attendanceResponse.attendanceReport || []);
    }
  }, [attendanceResponse]);

  // Fetch departments for admin users with caching
  useEffect(() => {
    const fetchDepartments = async () => {
      if (user?.role === 'admin') {
        setDepartmentsLoading(true);
        try {
          const response = await apiService.getDepartments();
          const departmentsList = response.departments || [];
          console.log('Fetched departments:', departmentsList);
          setDepartments(departmentsList);
          
          // Prefetch attendance data for all departments in background
          departmentsList.forEach(dept => {
            setTimeout(() => {
              apiService.getAttendance(dept).catch(console.warn);
            }, 100);
          });
        } catch (error) {
          console.error('Error fetching departments:', error);
          setDepartments([]);
          setApiError(`Failed to load departments: ${error.message}`);
          toast.error('Failed to load departments');
        } finally {
          setDepartmentsLoading(false);
        }
      }
    };
    fetchDepartments();
  }, [user]);

  // Optimized attendance fetching with caching
  const fetchDepartmentAttendance = useCallback(async (department) => {
    if (!department) return;
    
    // Check cache first
    if (departmentCache.has(department)) {
      setAttendanceData(departmentCache.get(department));
      return;
    }
    
    setLocalLoading(true);
    try {
      const response = await apiService.getAttendance(department);
      const attendanceReport = response.attendanceReport || [];
      
      // Cache the result
      setDepartmentCache(prev => new Map(prev.set(department, attendanceReport)));
      console.log('=== DEPARTMENT ATTENDANCE DEBUG ===');
      console.log('Department:', department);
      console.log('Attendance report:', attendanceReport);
      console.log('Report length:', attendanceReport.length);
      setAttendanceData(attendanceReport);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLocalLoading(false);
    }
  }, [departmentCache]);

  useEffect(() => {
    if (user?.role === 'admin' && selectedDepartment) {
      fetchDepartmentAttendance(selectedDepartment);
    }
  }, [selectedDepartment, user, fetchDepartmentAttendance]);

  const downloadExcel = () => {
    console.log('=== EXCEL DOWNLOAD DEBUG ===');
    console.log('Attendance data length:', attendanceData.length);
    console.log('Attendance data:', attendanceData);
    
    if (!attendanceData.length) {
      toast.error("No attendance data available");
      return;
    }
    
    const excelData = attendanceData.map((record, index) => ({
      "S.No": index + 1,
      "Roll No": record.rollNo || "N/A",
      "Name": record.studentName || "N/A",
      "Section": record.section || "N/A",
      "Total Classes": record.totalClasses || 0,
      "Present Classes": record.presentClasses || 0,
      "Attendance %": `${record.attendancePercentage || 0}%`
    }));
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    const departmentName = user.role === 'admin' ? selectedDepartment : user.department;
    XLSX.writeFile(wb, `Attendance_Report_${departmentName}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Excel report downloaded successfully!");
  };

  const downloadPDF = () => {
    console.log('=== PDF DOWNLOAD DEBUG ===');
    console.log('Attendance data length:', attendanceData.length);
    console.log('Attendance data:', attendanceData);
    
    if (!attendanceData.length) {
      toast.error("No attendance data available");
      return;
    }

    const doc = new jsPDF();
    const departmentName = user.role === 'admin' ? selectedDepartment : user.department;
    
    // Add title
    doc.setFontSize(20);
    doc.text('Attendance Report', 14, 22);
    
    // Add department and date
    doc.setFontSize(12);
    doc.text(`Department: ${departmentName}`, 14, 35);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 45);
    
    // Prepare table data
    const tableData = attendanceData.map((record, index) => [
      index + 1,
      record.rollNo || "N/A",
      record.studentName || "N/A",
      record.section || "N/A",
      record.totalClasses || 0,
      record.presentClasses || 0,
      `${record.attendancePercentage || 0}%`
    ]);

    // Add table
    doc.autoTable({
      head: [['S.No', 'Roll No', 'Name', 'Section', 'Total Classes', 'Present', 'Attendance %']],
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 55 }
    });

    // Add summary
    const totalStudents = attendanceData.length;
    const avgAttendance = totalStudents > 0 
      ? (attendanceData.reduce((sum, record) => sum + (record.attendancePercentage || 0), 0) / totalStudents).toFixed(1)
      : 0;

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Students: ${totalStudents}`, 14, finalY);
    doc.text(`Average Attendance: ${avgAttendance}%`, 14, finalY + 10);

    // Save the PDF
    doc.save(`Attendance_Report_${departmentName}_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("PDF report downloaded successfully!");
  };

  if (loading || (user?.role === 'admin' && departmentsLoading)) return <Loading />;

  if (user.role !== "HOD" && user.role !== "admin") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD and Admin can access this page.</p>
      </div>
    );
  }

  try {
    return (
      <main className="view-attendance">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        View Attendance
      </h2>
      
      {user.role === 'admin' ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select Department:</h3>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full md:w-64 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={departmentsLoading}
          >
            <option value="">
              {departmentsLoading ? 'Loading departments...' : 'Choose a department...'}
            </option>
            {Array.isArray(departments) && departments.length > 0 ? (
              departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))
            ) : (
              !departmentsLoading && <option disabled>No departments found</option>
            )}
          </select>
        </div>
      ) : (
        <h3 className="text-2xl font-semibold mb-6">
          Department: {user.department}
        </h3>
      )}

      {(error || apiError) && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error || apiError}
        </div>
      )}

      {user.role === 'admin' && !selectedDepartment ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-gray-600">Please select a department to view attendance reports</h3>
          </div>
        </div>
      ) : localLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <InstantLoader type="table" rows={10} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Department Attendance Report ({attendanceData.length})
              {localLoading && <span className="text-sm text-blue-600 ml-2">Loading...</span>}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedDepartment) {
                    setDepartmentCache(prev => {
                      const newCache = new Map(prev);
                      newCache.delete(selectedDepartment);
                      return newCache;
                    });
                    apiService.clearCache('attendance');
                    fetchDepartmentAttendance(selectedDepartment);
                  }
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                disabled={!selectedDepartment || localLoading}
                title="Refresh attendance data"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
              <button
                onClick={downloadExcel}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                disabled={!attendanceData.length || localLoading}
                title={!attendanceData.length ? "No data available" : "Download Excel report"}
              >
                <FaFileExcel />
                <span>Excel</span>
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                disabled={!attendanceData.length || localLoading}
                title={!attendanceData.length ? "No data available" : "Download PDF report"}
              >
                <FaFilePdf />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Classes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {attendanceData.map((record, index) => (
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

          {attendanceData.length === 0 && !localLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No attendance data found for this department.</p>
            </div>
          )}
          </div>
        )}
      </main>
    );
  } catch (renderError) {
    console.error('Render error in ViewAttendance:', renderError);
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-4">There was an error loading the attendance page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }
};

export default ViewAttendance;