import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const SalaryManagement = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSalary, setEditingSalary] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    salary: '',
    baseSalary: '',
    salaryType: 'fixed',
    dailyRate: '',
    hourlyRate: '',
    monthlySalary: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });
  const [calculatedRates, setCalculatedRates] = useState({
    dailyRate: '',
    hourlyRate: ''
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllStaff();
    }
  }, [user]);

  const fetchAllStaff = async () => {
    try {
      const response = await axios.get('/staff');
      setStaffList(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff data');
      setLoading(false);
    }
  };

  const handleUpdateSalary = async (staffId) => {
    try {
      await axios.patch(`/staff/${staffId}`, {
        salary: parseFloat(salaryForm.salary),
        baseSalary: parseFloat(salaryForm.baseSalary || salaryForm.salary),
        salaryType: salaryForm.salaryType,
        dailyRate: parseFloat(salaryForm.dailyRate || 0),
        hourlyRate: parseFloat(salaryForm.hourlyRate || 0)
      });
      
      toast.success('Salary updated successfully');
      setEditingSalary(null);
      setSalaryForm({ 
        salary: '', 
        baseSalary: '',
        salaryType: 'fixed',
        dailyRate: '',
        hourlyRate: '',
        monthlySalary: '',
        effectiveDate: new Date().toISOString().split('T')[0] 
      });
      setCalculatedRates({
        dailyRate: '',
        hourlyRate: ''
      });
      fetchAllStaff();
    } catch (error) {
      toast.error('Failed to update salary');
    }
  };

  const calculateAttendanceBasedSalary = async (staffId) => {
    try {
      const response = await axios.post('/staff-attendance/calculate-salary', {
        staffId,
        month: selectedMonth,
        year: selectedYear
      });
      
      if (response.data && response.data.salaryCalculation) {
        const { calculatedSalary } = response.data.salaryCalculation;
        const { presentDays, attendancePercentage } = response.data.attendanceStats;
        
        toast.success(
          `Salary calculated successfully!\n` +
          `Present Days: ${presentDays}\n` +
          `Attendance: ${attendancePercentage}%\n` +
          `Calculated Salary: Rs. ${calculatedSalary.toLocaleString('en-IN')}`,
          { autoClose: 5000 }
        );
        
        // Refresh staff list to show updated salary
        fetchAllStaff();
        
        return response.data;
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to calculate attendance-based salary';
      toast.error(errorMessage);
      return null;
    }
  };

  const calculateRatesFromMonthlySalary = () => {
    const monthly = parseFloat(salaryForm.monthlySalary);
    
    if (monthly && monthly > 0) {
      // Assuming 30 days per month and 9 hours per day
      const daily = monthly / 30;
      const hourly = daily / 9;
      
      const newCalculatedRates = {
        dailyRate: daily.toFixed(2),
        hourlyRate: hourly.toFixed(2)
      };
      
      const newSalaryForm = {
        ...salaryForm,
        dailyRate: daily.toFixed(2),
        hourlyRate: hourly.toFixed(2),
        salary: monthly.toString(),
        baseSalary: monthly.toString()
      };
      
      setCalculatedRates(newCalculatedRates);
      setSalaryForm(newSalaryForm);
      
      toast.success(`Rates calculated successfully! Daily: Rs. ${daily.toFixed(2)}, Hourly: Rs. ${hourly.toFixed(2)}`);
    } else {
      toast.error('Please enter a valid monthly salary amount');
    }
  };

  const startEditingSalary = (staff) => {
    setEditingSalary(staff._id);
    setSalaryForm({
      salary: staff.salary || '',
      baseSalary: staff.baseSalary || staff.salary || '',
      salaryType: staff.salaryType || 'fixed',
      dailyRate: staff.dailyRate || '',
      hourlyRate: staff.hourlyRate || '',
      monthlySalary: staff.salary || staff.baseSalary || '',
      effectiveDate: new Date().toISOString().split('T')[0]
    });
    setCalculatedRates({
      dailyRate: staff.dailyRate || '',
      hourlyRate: staff.hourlyRate || ''
    });
  };

  const generatePayslip = async (staff) => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    try {
      const response = await axios.post('/payslips/generate', {
        staffId: staff._id,
        month,
        year,
        generatedBy: user._id
      });
      
      toast.success(`Payslip generated successfully for ${staff.name}. ${response.data.payslip.emailSent ? 'Email sent!' : 'Check payslips section.'}`);
      
      // Refresh the staff list to show updated data
      fetchAllStaff();
    } catch (error) {
      if (error.response?.status === 409) {
        // Payslip already exists - directly regenerate without confirmation
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        toast.info(`Payslip already exists for ${staff.name} for ${monthNames[month-1]} ${year}. Regenerating...`);
        await regeneratePayslip(staff, month, year);
      } else {
        const errorMessage = error.response?.data?.message || 'Error generating payslip';
        toast.error(errorMessage);
        console.error('Error generating payslip:', error);
      }
    }
  };

  const regeneratePayslip = async (staff, month, year) => {
    try {
      const response = await axios.post('/payslips/regenerate', {
        staffId: staff._id,
        month,
        year,
        generatedBy: user._id
      });
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      toast.success(
        `Payslip regenerated successfully for ${staff.name} (${monthNames[month-1]} ${year})!\n` +
        `New Net Salary: Rs. ${response.data.payslip.netSalary.toLocaleString('en-IN')}`,
        { autoClose: 5000 }
      );
      
      // Refresh the staff list to show updated data
      fetchAllStaff();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error regenerating payslip';
      toast.error(errorMessage);
      console.error('Error regenerating payslip:', error);
    }
  };

  const generateAllPayslips = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      // Show info toast instead of confirmation dialog
      toast.info(`Generating payslips for all staff for ${monthNames[month-1]} ${year}...`);
      
      const response = await axios.post('/payslips/generate-all', {
        month,
        year,
        generatedBy: user._id
      });
      
      const { successful, alreadyExists, errors, errorDetails } = response.data;
      
      let message = `Bulk payslip generation completed!\n` +
                   `✅ Generated: ${successful}\n` +
                   `ℹ️ Already existed: ${alreadyExists}\n` +
                   `❌ Errors: ${errors}`;
      
      if (errors > 0 && errorDetails && errorDetails.length > 0) {
        message += `\n\nError details:\n`;
        errorDetails.slice(0, 3).forEach(error => {
          message += `• ${error.staffName}: ${error.error}\n`;
        });
        if (errorDetails.length > 3) {
          message += `• ... and ${errorDetails.length - 3} more errors`;
        }
      }
      
      toast.success(message, { autoClose: 10000 });
      
      // Refresh the staff list
      fetchAllStaff();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error generating payslips';
      toast.error(errorMessage);
      console.error('Error generating all payslips:', error);
    }
  };

  const exportSalaryReport = async (format = 'excel') => {
    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      if (format === 'excel') {
        // Create Excel data
        const excelData = staffList.map(staff => ({
          'Employee ID': staff.employeeId,
          'Name': staff.name,
          'Department': staff.department,
          'Role': staff.role.toUpperCase(),
          'Salary Type': staff.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed',
          'Base Salary': staff.salary || staff.baseSalary || 0,
          'Daily Rate': staff.dailyRate || 0,
          'Hourly Rate': staff.hourlyRate || 0,
          'Joining Date': staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'N/A'
        }));

        // Convert to CSV format for download
        const csvContent = convertToCSV(excelData);
        downloadFile(csvContent, `salary_report_${monthNames[selectedMonth-1]}_${selectedYear}.csv`, 'text/csv;charset=utf-8;');
        
      } else if (format === 'pdf') {
        // Generate PDF report
        generatePDFReport();
      }
      
      toast.success(`Salary report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export salary report');
      console.error('Export error:', error);
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadFile = (content, filename, contentType) => {
    // Add BOM for CSV files to ensure proper encoding
    const BOM = contentType.includes('csv') ? '\uFEFF' : '';
    const blob = new Blob([BOM + content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = async () => {
    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      // Create the report data
      const reportData = {
        title: `Salary Report - ${monthNames[selectedMonth-1]} ${selectedYear}`,
        generatedDate: new Date().toLocaleDateString(),
        summary: {
          totalStaff: staffList.length,
          totalPayroll: staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0),
          averageSalary: staffList.length > 0 ? Math.round(staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0) / staffList.length) : 0
        },
        staffData: staffList.map(staff => ({
          employeeId: staff.employeeId,
          name: staff.name,
          department: staff.department,
          role: staff.role.toUpperCase(),
          salaryType: staff.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed',
          baseSalary: staff.baseSalary || staff.salary || 0,
          dailyRate: staff.dailyRate || 0,
          hourlyRate: staff.hourlyRate || 0
        }))
      };

      // Send request to backend to generate PDF
      const response = await axios.post('/staff/generate-salary-report-pdf', reportData, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary_report_${monthNames[selectedMonth-1]}_${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Fallback to client-side HTML-to-PDF if backend fails
      generateClientSidePDF();
    }
  };

  const generateClientSidePDF = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Create HTML content for PDF conversion
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF6B35; padding-bottom: 15px;">
          <div style="color: #FF6B35; font-size: 24px; font-weight: bold;">EDUTRACK</div>
          <div style="color: #666; margin: 5px 0;">Educational Management System</div>
          <h2 style="margin: 10px 0;">Salary Report - ${monthNames[selectedMonth-1]} ${selectedYear}</h2>
          <p style="margin: 5px 0;">Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border: 1px solid #e9ecef;">
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div style="margin: 5px; font-weight: bold;">Total Staff: ${staffList.length}</div>
            <div style="margin: 5px; font-weight: bold;">Total Payroll: Rs. ${staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0).toLocaleString('en-IN')}</div>
            <div style="margin: 5px; font-weight: bold;">Average Salary: Rs. ${staffList.length > 0 ? Math.round(staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0) / staffList.length).toLocaleString('en-IN') : 0}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
          <thead>
            <tr style="background-color: #FF6B35; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Employee ID</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Department</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Role</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Salary Type</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Base Salary</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Daily Rate</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Hourly Rate</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map((staff, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                <td style="border: 1px solid #ddd; padding: 6px;">${staff.employeeId}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${staff.name}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${staff.department}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${staff.role.toUpperCase()}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${staff.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed'}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">Rs. ${(staff.salary || staff.baseSalary || 0).toLocaleString('en-IN')}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">Rs. ${(staff.dailyRate || 0).toLocaleString('en-IN')}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">Rs. ${(staff.hourlyRate || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
          <p>This report was generated by EDUTRACK Educational Management System</p>
          <p>© ${new Date().getFullYear()} EDUTRACK - All Rights Reserved</p>
        </div>
      </div>
    `;

    // Convert HTML to PDF using browser's built-in functionality
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Report - ${monthNames[selectedMonth-1]} ${selectedYear}</title>
        <style>
          @media print {
            body { margin: 0; }
            @page { size: A4; margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();

    toast.info('PDF generation window opened. Use Ctrl+P and "Save as PDF" to download', {
      autoClose: 5000
    });
  };

  const showSalaryIncrementAnalysis = () => {
    // Create analysis modal or navigate to analysis page
    const analysisData = staffList.map(staff => {
      const currentSalary = staff.salary || staff.baseSalary || 0;
      const suggestedIncrease = currentSalary * 0.1; // 10% increase suggestion
      const newSalary = currentSalary + suggestedIncrease;
      
      return {
        ...staff,
        currentSalary,
        suggestedIncrease,
        newSalary,
        incrementPercentage: 10
      };
    });
    
    // Calculate analysis summary
    const totalCurrentPayroll = analysisData.reduce((sum, staff) => sum + staff.currentSalary, 0);
    const totalNewPayroll = analysisData.reduce((sum, staff) => sum + staff.newSalary, 0);
    const totalIncrease = totalNewPayroll - totalCurrentPayroll;
    
    // Show analysis results via toast notification instead of alert
    toast.success(
      `Salary Increment Analysis Complete!\n\n` +
      `Current Total Payroll: Rs. ${totalCurrentPayroll.toLocaleString('en-IN')}\n` +
      `Proposed Total Payroll: Rs. ${totalNewPayroll.toLocaleString('en-IN')}\n` +
      `Total Increase: Rs. ${totalIncrease.toLocaleString('en-IN')}\n` +
      `Average Increase per Staff: Rs. ${Math.round(totalIncrease / staffList.length).toLocaleString('en-IN')}\n\n` +
      `Analysis suggests a 10% increment for all staff members.`,
      { autoClose: 8000 }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading salary data...</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Salary Management</h1>
      
      {/* Month/Year Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Salary Calculation Period</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={2024 + i} value={2024 + i}>
                  {2024 + i}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Staff</h3>
          <p className="text-3xl font-bold text-blue-600">{staffList.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Monthly Payroll</h3>
          <p className="text-3xl font-bold text-green-600">
            Rs. {staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Salary</h3>
          <p className="text-3xl font-bold text-purple-600">
            Rs. {staffList.length > 0 ? Math.round(staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0) / staffList.length).toLocaleString('en-IN') : 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Attendance-Based Staff</h3>
          <p className="text-3xl font-bold text-orange-600">
            {staffList.filter(staff => staff.salaryType === 'attendance-based').length}
          </p>
        </div>
      </div>

      {/* Staff Salary Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Staff Salary Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Employee ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Salary Type</th>
                <th className="px-4 py-2 text-left">Base/Current Salary</th>
                <th className="px-4 py-2 text-left">Daily/Hourly Rate</th>
                <th className="px-4 py-2 text-left">Joining Date</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{staff.employeeId}</td>
                  <td className="px-4 py-2 font-medium">{staff.name}</td>
                  <td className="px-4 py-2">{staff.department}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      staff.role === 'HOD' ? 'bg-purple-100 text-purple-800' :
                      staff.role === 'admin' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {staff.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      staff.salaryType === 'attendance-based' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {staff.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {editingSalary === staff._id ? (
                      <div className="space-y-2">
                        <select
                          value={salaryForm.salaryType}
                          onChange={(e) => setSalaryForm({...salaryForm, salaryType: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="fixed">Fixed Salary</option>
                          <option value="attendance-based">Attendance-Based</option>
                        </select>
                        
                        {/* Monthly Salary Input */}
                        <div className="bg-blue-50 p-2 rounded">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Monthly Salary (Auto-calculate rates)
                          </label>
                          <input
                            type="number"
                            value={salaryForm.monthlySalary}
                            onChange={(e) => setSalaryForm({...salaryForm, monthlySalary: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Enter monthly salary"
                          />
                          <button
                            type="button"
                            onClick={calculateRatesFromMonthlySalary}
                            className="w-full mt-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Calculate Daily & Hourly Rates
                          </button>
                        </div>

                        {/* Display calculated rates */}
                        {calculatedRates.dailyRate && (
                          <div className="bg-green-50 p-2 rounded text-xs">
                            <div>Daily Rate: Rs. {calculatedRates.dailyRate}</div>
                            <div>Hourly Rate: Rs. {calculatedRates.hourlyRate}</div>
                          </div>
                        )}

                        <input
                          type="number"
                          value={salaryForm.salaryType === 'fixed' ? salaryForm.salary : salaryForm.baseSalary}
                          onChange={(e) => setSalaryForm({
                            ...salaryForm, 
                            [salaryForm.salaryType === 'fixed' ? 'salary' : 'baseSalary']: e.target.value
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder={salaryForm.salaryType === 'fixed' ? 'Fixed Salary' : 'Base Salary'}
                        />
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleUpdateSalary(staff._id)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSalary(null)}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium">
                          Rs. {(staff.salary || staff.baseSalary || 0).toLocaleString('en-IN')}
                        </span>
                        {staff.salaryType === 'attendance-based' && (
                          <div className="text-xs text-gray-500">
                            Base: Rs. {(staff.baseSalary || 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingSalary === staff._id && salaryForm.salaryType === 'attendance-based' ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          value={salaryForm.dailyRate}
                          onChange={(e) => setSalaryForm({...salaryForm, dailyRate: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Daily Rate"
                        />
                        <input
                          type="number"
                          value={salaryForm.hourlyRate}
                          onChange={(e) => setSalaryForm({...salaryForm, hourlyRate: e.target.value})}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Hourly Rate"
                        />
                      </div>
                    ) : (
                      <div className="text-sm">
                        {staff.salaryType === 'attendance-based' ? (
                          <>
                            <div>Daily: Rs. {(staff.dailyRate || 0).toLocaleString('en-IN')}</div>
                            <div>Hourly: Rs. {(staff.hourlyRate || 0).toLocaleString('en-IN')}</div>
                          </>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-2">
                      {editingSalary !== staff._id && (
                        <button
                          onClick={() => startEditingSalary(staff)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Edit Salary
                        </button>
                      )}
                      {staff.salaryType === 'attendance-based' && (
                        <button
                          onClick={() => {
                            console.log('Calculating salary for staff:', staff.name, staff._id);
                            console.log('Staff salary type:', staff.salaryType);
                            console.log('Selected month/year:', selectedMonth, selectedYear);
                            calculateAttendanceBasedSalary(staff._id);
                          }}
                          className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 mr-1"
                        >
                          Calculate
                        </button>
                      )}
                      <button
                        onClick={() => generatePayslip(staff)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                      >
                        Generate Payslip
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {staffList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No staff records found.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Bulk Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={generateAllPayslips}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Generate All Payslips
          </button>
          <div className="relative group">
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Export Salary Report
            </button>
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button 
                onClick={() => exportSalaryReport('excel')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Export as Excel
              </button>
              <button 
                onClick={() => exportSalaryReport('pdf')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Export as PDF
              </button>
            </div>
          </div>
          <button 
            onClick={showSalaryIncrementAnalysis}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Salary Increment Analysis
          </button>
          <button 
            onClick={() => navigate('/dash/admin_payslips')}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
          >
            View All Payslips
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryManagement;