import { useState, useEffect, useContext, useCallback } from "react";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import { FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";

const SemesterSettings = () => {
  const { user } = useContext(UserContext);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    semester: '',
    startDate: '',
    endDate: '',
    description: '',
    academicYear: '2024-2025'
  });

  const semesters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const academicYears = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];

  // Fetch semester settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/semester/settings/${user.department}?academicYear=${formData.academicYear}`);
      setSettings(res.data.settings || []);
    } catch (err) {
      console.error('Error fetching semester settings:', err);
      toast.error('Failed to load semester settings');
    } finally {
      setLoading(false);
    }
  }, [user.department, formData.academicYear]);

  useEffect(() => {
    if (user.role === 'HOD' && user.department) {
      fetchSettings();
    }
  }, [user.role, user.department, formData.academicYear, fetchSettings]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.semester || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all required fields');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const payload = {
        ...formData,
        department: user.department,
        userId: user._id
      };

      await axios.post('/semester/settings', payload);
      toast.success('Semester settings saved successfully!');
      
      // Reset form and refresh data
      setFormData({
        semester: '',
        startDate: '',
        endDate: '',
        description: '',
        academicYear: formData.academicYear
      });
      setShowAddForm(false);
      setEditingId(null);
      fetchSettings();
    } catch (err) {
      console.error('Error saving semester settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save semester settings');
    }
  };

  // Handle edit
  const handleEdit = (setting) => {
    setFormData({
      semester: setting.semester,
      startDate: setting.startDate.split('T')[0],
      endDate: setting.endDate.split('T')[0],
      description: setting.description || '',
      academicYear: setting.academicYear
    });
    setEditingId(setting._id);
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this semester setting?')) {
      return;
    }

    try {
      await axios.delete(`/semester/settings/${id}`, {
        data: { userId: user._id }
      });
      toast.success('Semester setting deleted successfully!');
      fetchSettings();
    } catch (err) {
      console.error('Error deleting semester setting:', err);
      toast.error(err.response?.data?.message || 'Failed to delete semester setting');
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      semester: '',
      startDate: '',
      endDate: '',
      description: '',
      academicYear: formData.academicYear
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  if (user.role !== 'HOD') {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only HODs can manage semester settings.</p>
      </div>
    );
  }

  return (
    <main className="semester-settings p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-violet-900 dark:text-slate-200 flex items-center gap-2">
            <FaCalendarAlt /> Semester Date Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure semester start and end dates for attendance control - Department: {user.department}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Add Semester
        </button>
      </div>

      {/* Academic Year Filter */}
      <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg border">
        <label className="block text-sm font-medium mb-2">Academic Year</label>
        <select
          value={formData.academicYear}
          onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
          className="w-48 p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
        >
          {academicYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Semester Settings' : 'Add New Semester Settings'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Semester *</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
                required
              >
                <option value="">Select Semester</option>
                {semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-gray-600"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaSave /> {editingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settings List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Current Semester Settings ({formData.academicYear})</h3>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading settings...</p>
          </div>
        ) : settings.length === 0 ? (
          <div className="text-center py-8">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No semester settings configured yet.</p>
            <p className="text-sm text-gray-500 mt-2">Add semester dates to enable attendance date restrictions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Semester</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Start Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">End Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {settings.map((setting) => {
                  const startDate = new Date(setting.startDate);
                  const endDate = new Date(setting.endDate);
                  const today = new Date();
                  const isActive = today >= startDate && today <= endDate;
                  const isPast = today > endDate;
                  
                  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={setting._id} className={isActive ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                      <td className="px-4 py-3 font-medium">Semester {setting.semester}</td>
                      <td className="px-4 py-3">{startDate.toLocaleDateString()}</td>
                      <td className="px-4 py-3">{endDate.toLocaleDateString()}</td>
                      <td className="px-4 py-3">{duration} days</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : isPast
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        }`}>
                          {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{setting.description || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(setting)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(setting._id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 How Semester Date Control Works</h4>
        <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <li>• Teachers can only mark attendance on dates within the configured semester range</li>
          <li>• Each semester must have a start date and end date</li>
          <li>• Attendance system will automatically restrict date selection based on these settings</li>
          <li>• Only HODs can configure semester dates for their department</li>
          <li>• Example: Semester starting 02-06-2025 to ending 02-12-2025 allows attendance only in this period</li>
        </ul>
      </div>
    </main>
  );
};

export default SemesterSettings;