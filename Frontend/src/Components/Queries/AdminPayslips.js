import { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import { FaDownload, FaEye, FaEnvelope, FaCalendarAlt, FaSearch } from 'react-icons/fa';

const AdminPayslips = () => {
  const { user } = useContext(UserContext);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);

      const response = await axios.get(`/payslips/all?${params.toString()}`);
      setPayslips(response.data || []);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to fetch payslips');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedDepartment]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get('/staff/departments');
      setDepartments(response.data?.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  }, []);

  const filterPayslips = useCallback(() => {
    let filtered = payslips;
    
    if (searchTerm) {
      filtered = filtered.filter(payslip => 
        (payslip.staffName && payslip.staffName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payslip.employeeId && payslip.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payslip.department && payslip.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredPayslips(filtered);
  }, [payslips, searchTerm]);

  useEffect(() => {
    const loadData = async () => {
      if (user?.role === 'admin') {
        try {
          await Promise.all([fetchPayslips(), fetchDepartments()]);
        } catch (error) {
          console.error('Error loading data:', error);
          toast.error('Failed to load data');
        }
      }
    };
    
    loadData();
  }, [user, fetchPayslips, fetchDepartments]);

  useEffect(() => {
    filterPayslips();
  }, [filterPayslips]);

  const downloadPayslip = async (payslipId, staffName, month, year) => {
    try {
      const response = await axios.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      link.setAttribute('download', `payslip_${staffName}_${monthNames[month-1]}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payslip downloaded successfully');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip');
    }
  };

  const viewPayslip = async (payslipId) => {
    try {
      const response = await axios.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing payslip:', error);
      toast.error('Failed to view payslip');
    }
  };

  const resendEmail = async (payslipId, staffName) => {
    try {
      await axios.post(`/payslips/${payslipId}/resend-email`);
      toast.success(`Email resent successfully to ${staffName}`);
      fetchPayslips(); // Refresh to update email status
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend email');
    }
  };

  const getMonthName = (monthNumber) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const index = (monthNumber || 1) - 1;
    return monthNames[index] || monthNames[0]; // Default to January if invalid
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalPayroll = () => {
    if (!Array.isArray(filteredPayslips)) return 0;
    return filteredPayslips.reduce((total, payslip) => {
      if (!payslip) return total;
      return total + (payslip.netSalary || 0);
    }, 0);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading user data...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading payslips...</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to administrators</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">All Staff Payslips</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Payslips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Years</option>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, or department"
                className="w-full border border-gray-300 rounded-md px-3 py-2 pl-10"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Payslips</h3>
          <p className="text-3xl font-bold text-blue-600">{filteredPayslips.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Payroll</h3>
          <p className="text-3xl font-bold text-green-600">
            Rs. {calculateTotalPayroll().toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Emails Sent</h3>
          <p className="text-3xl font-bold text-purple-600">
            {(filteredPayslips || []).filter(p => p && p.emailSent).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Emails</h3>
          <p className="text-3xl font-bold text-orange-600">
            {(filteredPayslips || []).filter(p => p && !p.emailSent).length}
          </p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Payslip Records</h2>
        
        {!Array.isArray(filteredPayslips) || filteredPayslips.length === 0 ? (
          <div className="text-center py-8">
            <FaCalendarAlt className="mx-auto text-gray-400 text-4xl mb-4" />
            <p className="text-gray-500 text-lg">No payslips found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your filters or generate new payslips
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Staff Details</th>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-left">Month/Year</th>
                  <th className="px-4 py-2 text-left">Basic Salary</th>
                  <th className="px-4 py-2 text-left">Net Salary</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Generated</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filteredPayslips || []).map((payslip) => payslip && (
                  <tr key={payslip._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div>
                        <div className="font-medium">{payslip.staffName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">ID: {payslip.employeeId || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {payslip.department || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {getMonthName(payslip.month || 1)} {payslip.year || new Date().getFullYear()}
                    </td>
                    <td className="px-4 py-2">
                      Rs. {(payslip.earnings?.basicSalary || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 font-bold text-blue-600">
                      Rs. {(payslip.netSalary || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status || 'draft')}`}>
                        {payslip.status === 'sent' ? 'Email Sent' : 
                         payslip.status === 'generated' ? 'Generated' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {payslip.createdAt ? new Date(payslip.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewPayslip(payslip._id)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View Payslip"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => downloadPayslip(payslip._id, payslip.staffName || 'Unknown', payslip.month || 1, payslip.year || new Date().getFullYear())}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                        <button
                          onClick={() => resendEmail(payslip._id, payslip.staffName || 'Unknown')}
                          className={`p-1 rounded ${payslip.emailSent ? 'text-purple-600 hover:text-purple-800' : 'text-orange-600 hover:text-orange-800'}`}
                          title={payslip.emailSent ? 'Resend Email' : 'Send Email'}
                        >
                          <FaEnvelope />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    );
  } catch (error) {
    console.error('Error rendering AdminPayslips:', error);
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Payslips</h2>
          <p className="text-red-600">There was an error loading the payslips interface. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default AdminPayslips;