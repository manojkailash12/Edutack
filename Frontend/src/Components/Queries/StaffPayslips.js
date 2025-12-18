import { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import { FaDownload, FaEye, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';

const StaffPayslips = () => {
  const { user } = useContext(UserContext);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filteredPayslips, setFilteredPayslips] = useState([]);

  const fetchPayslips = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/payslips/staff/${user._id}?year=${selectedYear}`);
      setPayslips(response.data || []);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to fetch payslips');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, selectedYear]);

  const filterPayslips = useCallback(() => {
    if (selectedMonth === 'all') {
      setFilteredPayslips(payslips);
    } else {
      setFilteredPayslips(payslips.filter(payslip => payslip.month === parseInt(selectedMonth)));
    }
  }, [payslips, selectedMonth]);

  useEffect(() => {
    if (user?._id) {
      fetchPayslips();
    }
  }, [user, fetchPayslips]);

  useEffect(() => {
    filterPayslips();
  }, [filterPayslips]);

  const downloadPayslip = async (payslipId, staffName, month, year) => {
    try {
      const response = await axios.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
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
      
      // Create blob URL and open in new tab
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing payslip:', error);
      toast.error('Failed to view payslip');
    }
  };

  const getMonthName = (monthNumber) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[monthNumber - 1];
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

  const calculateYearlyTotal = () => {
    return filteredPayslips.reduce((total, payslip) => total + (payslip.netSalary || 0), 0);
  };

  const calculateMonthlyAverage = () => {
    if (filteredPayslips.length === 0) return 0;
    return calculateYearlyTotal() / filteredPayslips.length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading payslips...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Payslips</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Payslips</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
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
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Payslips</h3>
          <p className="text-3xl font-bold text-blue-600">{filteredPayslips.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {selectedMonth === 'all' ? 'Yearly Total' : 'Monthly Total'}
          </h3>
          <p className="text-3xl font-bold text-green-600">
            Rs. {calculateYearlyTotal().toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Salary</h3>
          <p className="text-3xl font-bold text-purple-600">
            Rs. {Math.round(calculateMonthlyAverage()).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Payslip History</h2>
        
        {filteredPayslips.length === 0 ? (
          <div className="text-center py-8">
            <FaCalendarAlt className="mx-auto text-gray-400 text-4xl mb-4" />
            <p className="text-gray-500 text-lg">No payslips found for the selected period</p>
            <p className="text-gray-400 text-sm mt-2">
              Payslips will appear here once generated by the admin
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Month/Year</th>
                  <th className="px-4 py-2 text-left">Basic Salary</th>
                  <th className="px-4 py-2 text-left">Total Earnings</th>
                  <th className="px-4 py-2 text-left">Deductions</th>
                  <th className="px-4 py-2 text-left">Net Salary</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Generated Date</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.map((payslip) => (
                  <tr key={payslip._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {getMonthName(payslip.month)} {payslip.year}
                    </td>
                    <td className="px-4 py-2">
                      Rs. {payslip.earnings.basicSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 text-green-600 font-medium">
                      Rs. {payslip.earnings.totalEarnings.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 text-red-600">
                      Rs. {payslip.deductions.totalDeductions.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 font-bold text-blue-600">
                      Rs. {payslip.netSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status)}`}>
                        {payslip.status === 'sent' ? 'Email Sent' : 
                         payslip.status === 'generated' ? 'Generated' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(payslip.createdAt).toLocaleDateString('en-IN')}
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
                          onClick={() => downloadPayslip(payslip._id, payslip.staffName, payslip.month, payslip.year)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                        {payslip.emailSent && (
                          <span className="text-purple-600 p-1" title="Email Sent">
                            <FaEnvelope />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Breakdown for Latest Payslip */}
      {filteredPayslips.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Latest Payslip Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <h3 className="text-lg font-medium text-green-600 mb-3">Earnings</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span>Rs. {filteredPayslips[0].earnings.basicSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowances:</span>
                  <span>Rs. {filteredPayslips[0].earnings.allowances.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime:</span>
                  <span>Rs. {filteredPayslips[0].earnings.overtime.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus:</span>
                  <span>Rs. {filteredPayslips[0].earnings.bonus.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Earnings:</span>
                  <span className="text-green-600">Rs. {filteredPayslips[0].earnings.totalEarnings.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-3">Deductions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>Rs. {filteredPayslips[0].deductions.tax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provident Fund:</span>
                  <span>Rs. {filteredPayslips[0].deductions.providentFund.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Insurance:</span>
                  <span>Rs. {filteredPayslips[0].deductions.insurance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other:</span>
                  <span>Rs. {filteredPayslips[0].deductions.other.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Deductions:</span>
                  <span className="text-red-600">Rs. {filteredPayslips[0].deductions.totalDeductions.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Net Salary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Net Salary:</span>
              <span className="text-2xl font-bold text-blue-600">
                Rs. {filteredPayslips[0].netSalary.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPayslips;