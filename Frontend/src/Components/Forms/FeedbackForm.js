import { useState, useContext } from "react";
import { toast } from "react-toastify";
import { FaStar } from "react-icons/fa";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";

const FeedbackForm = () => {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    customCategory: "",
    rating: 0,
    feedback: ""
  });
  const [loading, setLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const categories = [
    "Course Content",
    "Teaching Quality", 
    "Lab Facilities",
    "Infrastructure",
    "Other"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "category") {
      setShowCustomCategory(value === "Other");
      if (value !== "Other") {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          customCategory: ""
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

  const handleStarClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate user context
    if (!user || !user._id) {
      toast.error("User session expired. Please login again.");
      return;
    }
    
    if (!formData.subject || !formData.category || !formData.rating || !formData.feedback) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.category === "Other" && !formData.customCategory.trim()) {
      toast.error("Please specify the feedback category");
      return;
    }

    if (formData.feedback.length > 1000) {
      toast.error("Feedback must be less than 1000 characters");
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      toast.error("Please provide a valid rating (1-5 stars)");
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        category: formData.category === "Other" ? formData.customCategory.trim() : formData.category,
        studentId: user._id
      };
      await axios.post("/feedback/submit", submitData);
      toast.success("Feedback submitted successfully!");
      
      // Reset form
      setFormData({
        subject: "",
        category: "",
        customCategory: "",
        rating: 0,
        feedback: ""
      });
      setShowCustomCategory(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Failed to submit feedback. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <FaStar
          key={index}
          className={`text-2xl cursor-pointer transition-colors ${
            starValue <= (hoveredStar || formData.rating) 
              ? 'text-yellow-400' 
              : 'text-gray-300'
          }`}
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => setHoveredStar(starValue)}
          onMouseLeave={() => setHoveredStar(0)}
        />
      );
    });
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Authentication Required</h2>
        <p className="text-gray-600">Please login to submit feedback.</p>
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only students can submit feedback.</p>
      </div>
    );
  }

  return (
    <main className="feedback-form">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Submit Feedback
      </h2>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject/Course
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
              placeholder="Enter subject name"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {showCustomCategory && (
            <div>
              <label htmlFor="customCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Specify Category
              </label>
              <input
                type="text"
                id="customCategory"
                name="customCategory"
                value={formData.customCategory}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
                placeholder="Enter feedback category"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rating
            </label>
            <div className="flex items-center space-x-1">
              {renderStars()}
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {formData.rating > 0 ? `${formData.rating}/5` : "Click to rate"}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feedback
            </label>
            <textarea
              id="feedback"
              name="feedback"
              value={formData.feedback}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 dark:bg-slate-700 dark:text-white"
              placeholder="Share your feedback..."
              maxLength={1000}
              required
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formData.feedback.length}/1000 characters
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default FeedbackForm;