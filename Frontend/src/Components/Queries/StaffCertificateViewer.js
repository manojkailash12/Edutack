import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../config/api/axios';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';

const StaffCertificateViewer = () => {
  const { user } = useContext(UserContext);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    academicYear: '2025-2026',
    semester: 'Semester 1',
    department: '',
    section: ''
  });
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'HOD') {
      fetchDepartmentsAndSections();
    }
  }, [user]);

  const fetchDepartmentsAndSections = useCallback(async () => {
    try {
      const response = await axios.get('/certificates/departments-sections');
      const { departments, sections, academicYears } = response.data.data;
      setDepartments(departments);
      setSections(sections);
      setAcademicYears(academicYears);
    } catch (error) {
      console.error('Error fetching departments and sections:', error);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/certificates/staff-view', {
        params: {
          academicYear: filters.academicYear,
          semester: filters.semester,
          department: filters.department || undefined,
          section: filters.section || undefined,
          staffId: user._id
        }
      });
      setCertificates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [filters, user._id]);

  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'HOD') {
      fetchDepartmentsAndSections();
      fetchCertificates();
    }
  }, [user, fetchDepartmentsAndSections, fetchCertificates]);

  const handleDownload = async (certificateId) => {
    try {
      const response = await axios.get(`/certificates/download/${certificateId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return 'text-green-600 bg-green-100';
      case 'A': return 'text-green-600 bg-green-100';
      case 'B+': return 'text-blue-600 bg-blue-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading certificates...</p>
      </div>
    );
  }

  if (user?.role !== 'teacher' && user?.role !== 'HOD') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to teaching staff</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Certificates</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({...filters, semester: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {[1,2,3,4,5,6,7,8].map(sem => (
                <option key={sem} value={`Semester ${sem}`}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={filters.section}
              onChange={(e) => setFilters({...filters, section: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No student certificates are available for the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <div key={certificate._id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              {/* Certificate Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{certificate.student?.name}</h3>
                    <p className="text-blue-100 text-sm">{certificate.student?.rollNo}</p>
                    <p className="text-blue-100 text-sm">{certificate.student?.department} - {certificate.student?.section}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(certificate.overallGrade)}`}>
                      {certificate.overallGrade}
                    </div>
                    <p className="text-blue-100 text-sm mt-1">{certificate.overallPercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Certificate Content */}
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Academic Details</h4>
                  <p className="text-sm text-gray-600">{certificate.academicYear} - {certificate.semester}</p>
                  <p className="text-sm text-gray-600">Subjects: {certificate.subjects.length}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Performance Summary</h4>
                  <div className="space-y-1">
                    {certificate.subjects.slice(0, 3).map((subject, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 truncate">{subject.paper?.paper}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(subject.grade)}`}>
                          {subject.grade}
                        </span>
                      </div>
                    ))}
                    {certificate.subjects.length > 3 && (
                      <p className="text-xs text-gray-500">+{certificate.subjects.length - 3} more subjects</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    Generated: {new Date(certificate.generatedDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="capitalize font-medium">{certificate.status}</span>
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleDownload(certificate._id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffCertificateViewer;