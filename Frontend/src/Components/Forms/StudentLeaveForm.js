import { useState, useContext } from "react";
import { toast } from "react-toastify";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";

const StudentLeaveForm = () => {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    leaveType: "",
    customLeaveType: "",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [loading, setLoading] = useState(false);
  const [showCustomLeaveType, setShowCustomLeaveType] = useState(false);

  const leaveTypes = [
    "Medical",
    "Personal", 
    "Emergency",
    "Family",
    "Other"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "leaveType") {
      setShowCustomLeaveType(value === "Other");
      if (value !== "Other") {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          customLeaveType: ""
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate user context
    if (!user || !user._id) {
      toast.error("User session expired. Please login again.");
      return;
    }
    
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.leaveType === "Other" && !formData.customLeaveType.trim()) {
      toast.error("Please specify the leave type");
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error("Start date cannot be in the past");
      return;
    }

    if (startDate >= endDate) {
      toast.error("End date must be after start date");
      return;
    }

    if (formData.reason.length > 500) {
      toast.error("Reason must be less than 500 characters");
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        leaveType: formData.leaveType === "Other" ? formData.customLeaveType.trim() : formData.leaveType,
        studentId: user._id
      };
      await axios.post("/leave/student/submit", submitData);
      toast.success("Leave request submitted successfully!");
      
      // Reset form
      setFormData({
        leaveType: "",
        customLeaveType: "",
        startDate: "",
        endDate: "",
        reason: ""
      });
      setShowCustomLeaveType(false);
    } catch (error) {
      console.error("Error submitting leave request:", error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Failed to submit leave request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Authentication Required</h2>
        <p className="text-gray-600">Please login to submit leave request.</p>
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only students can submit leave requests.</p>
      </div>
    );
  }

  return (
    <main className="student-leave-form">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Submit Leave Request
      </h2>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Leave Type
            </label>
            <select
              id="leaveType"
              name="leaveType"
              value={formData.leaveType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {showCustomLeaveType && (
            <div>
              <label htmlFor="customLeaveType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Specify Leave Type
              </label>
              <input
                type="text"
                id="customLeaveType"
                name="customLeaveType"
                value={formData.customLeaveType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
                placeholder="Enter leave type"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Leave
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
              placeholder="Please provide a detailed reason for your leave request..."
              maxLength={500}
              required
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formData.reason.length}/500 characters
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default StudentLeaveForm;