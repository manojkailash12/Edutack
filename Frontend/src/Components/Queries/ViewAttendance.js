import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import * as XLSX from 'xlsx';

const ViewAttendance = () => {
  const { user } = useContext(UserContext);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await axios.get(`/attendance/department-report/${encodeURIComponent(user.department)}`);
        setAttendanceData(response.data.attendanceReport || []);
      } catch (err) {
        setError("Failed to fetch attendance data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "HOD" && user.department) {
      fetchAttendanceData();
    }
  }, [user]);

  const downloadExcel = () => {
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
    XLSX.writeFile(wb, `Attendance_Report_${user.department}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Attendance report downloaded successfully!");
  };

  if (loading) return <Loading />;

  if (user.role !== "HOD") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD can access this page.</p>
      </div>
    );
  }

  return (
    <main className="view-attendance">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        View Attendance
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        Department: {user.department}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Department Attendance Report ({attendanceData.length})</h3>
          <button
            onClick={downloadExcel}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
          >
            <FaDownload />
            <span>Download Excel</span>
          </button>
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

        {attendanceData.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No attendance data found for your department.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default ViewAttendance;