import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from '../../config/api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserContext from '../../Hooks/UserContext';
import Loading from '../Layouts/Loading';
import { FaUpload, FaFile, FaTrash, FaClock, FaCheck, FaDownload, FaEye, FaExclamationTriangle } from 'react-icons/fa';

const AssignmentSubmitForm = () => {
  const { assignmentId } = useParams();
  const { user } = useContext(UserContext);
  const [assignment, setAssignment] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await axios.get(`/assignments/assignment/${assignmentId}`);
        const assignmentData = response.data;
        setAssignment(assignmentData);
        
        // Check for existing submission
        const existingSub = assignmentData.submissions?.find(sub => sub.student === user._id);
        if (existingSub) {
          setExistingSubmission(existingSub);
        }
        
        // Calculate time left
        const deadline = new Date(assignmentData.dueDate);
        const now = new Date();
        const timeDiff = deadline - now;
        setTimeLeft(Math.max(0, timeDiff));
        
      } catch (err) {
        console.error('Error loading assignment:', err);
        const errorMessage = err?.response?.data?.message || 'Error loading assignment';
        toast.error(errorMessage);
        // Don't navigate away, let user stay on page to see the error
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignment();
  }, [assignmentId, user._id, navigate]);

  // Update time left every second
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTimeLeft = (milliseconds) => {
    if (milliseconds <= 0) return 'Deadline passed';
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      toast.error('Maximum 3 files allowed');
      return;
    }
    
    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} has unsupported format`);
        fileInputRef.current.value = '';
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        fileInputRef.current.value = '';
        return;
      }
    }
    
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadAttachment = async (filePath, fileName) => {
    try {
      console.log('Downloading file:', filePath);
      
      // Get the actual filename from the path
      const actualFileName = filePath.split('/').pop();
      const fileExtension = actualFileName.split('.').pop().toLowerCase();
      
      console.log('File extension:', fileExtension);
      
      // Determine MIME type based on file extension
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
      };
      
      const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
      console.log('Expected MIME type:', mimeType);
      
      const response = await axios.get(filePath, {
        responseType: 'blob'
      });
      
      console.log('Response content type:', response.headers['content-type']);
      console.log('Response data type:', typeof response.data);
      
      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      
      // For PDFs, open in new tab instead of downloading
      if (fileExtension === 'pdf') {
        console.log('Opening PDF in new tab');
        window.open(url, '_blank');
      } else {
        console.log('Downloading file:', actualFileName);
        // For other files, download them
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', actualFileName || fileName || 'attachment');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Error downloading file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (timeLeft <= 0 && !assignment.allowLateSubmission) {
      toast.error('Assignment deadline has passed');
      return;
    }
    
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to submit');
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('student', user._id);
    
    // Append files
    selectedFiles.forEach(file => {
      formData.append('attachments', file);
    });
    
    try {
      await axios.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      toast.success('Assignment submitted successfully!');
      // Refresh to show new submission
      window.location.reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error submitting assignment');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteSubmission = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/assignments/${assignmentId}/submit/${user._id}`);
      toast.success('Submission deleted successfully');
      // Refresh the page to update the view
      window.location.reload();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err?.response?.data?.message || 'Error deleting submission');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <Loading />;
  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assignment Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The assignment you're looking for could not be found or may have been removed.
            </p>
            <button
              onClick={() => navigate('/dash/assignments')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Assignments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDeadlinePassed = timeLeft <= 0;
  const isDeadlineNear = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {assignment.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{assignment.description}</p>
              {assignment.instructions && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Instructions:</h3>
                  <div className="text-blue-700 dark:text-blue-300 whitespace-pre-line text-sm">
                    {assignment.instructions}
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>
                <span>Max Marks: {assignment.maxMarks}</span>
                <span className={`flex items-center space-x-1 ${
                  isDeadlinePassed ? 'text-red-600' : isDeadlineNear ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  <FaClock />
                  <span>{formatTimeLeft(timeLeft)}</span>
                </span>
              </div>
            </div>
            
            {isDeadlinePassed && !assignment.allowLateSubmission && (
              <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg">
                <FaExclamationTriangle />
                <span className="text-sm font-medium">Deadline Passed</span>
              </div>
            )}
          </div>

          {/* Assignment Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Assignment Files:</h3>
              <div className="space-y-2">
                {assignment.attachments.map((filePath, index) => {
                  const fileName = filePath.split('/').pop();
                  const fileExtension = fileName.split('.').pop().toLowerCase();
                  const isPDF = fileExtension === 'pdf';
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FaFile className="text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">{fileName}</span>
                      </div>
                      <button
                        onClick={() => downloadAttachment(filePath, fileName)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title={isPDF ? "View PDF" : "Download File"}
                      >
                        {isPDF ? <FaEye /> : <FaDownload />}
                        <span className="text-sm">{isPDF ? "View" : "Download"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Existing Submission */}
          {existingSubmission && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <FaCheck className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submitted</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(existingSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Your Submitted Files:</h4>
                
                {existingSubmission.attachments && existingSubmission.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {existingSubmission.attachments.map((filePath, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-600 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FaFile className="text-blue-500" />
                          <span className="text-gray-700 dark:text-gray-300">{filePath.split('/').pop()}</span>
                        </div>
                        <button
                          onClick={() => downloadAttachment(filePath, `submission-${index + 1}`)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View/Download File"
                        >
                          <FaDownload />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No files submitted</p>
                )}
              </div>
              
              {/* Delete Submission Button */}
              <div className="mb-4">
                <button
                  onClick={handleDeleteSubmission}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTrash />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Submission'}</span>
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  You can delete your submission anytime, even after the deadline
                </p>
              </div>
              
              {existingSubmission.isGraded && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Graded</h4>
                  <p className="text-green-700 dark:text-green-300">
                    Score: {existingSubmission.score}/{assignment.maxMarks}
                  </p>
                  {existingSubmission.feedback && (
                    <p className="text-green-600 dark:text-green-400 mt-2">
                      Feedback: {existingSubmission.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New/Update Submission */}
          {(!existingSubmission || (assignment.allowRetake && (!isDeadlinePassed || assignment.allowLateSubmission))) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {existingSubmission ? 'Update Submission' : 'Submit Assignment'}
              </h3>
              
              {isDeadlinePassed && !assignment.allowLateSubmission ? (
              <div className="text-center py-8">
                <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  The deadline for this assignment has passed.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  You can still view your previous submission.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                  <div className="text-center">
                    <FaUpload className="text-4xl text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Upload Assignment Files *
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Images, PDF, DOC, DOCX, TXT (max 3 files, 10MB each)
                    </p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Choose Files
                    </button>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="font-medium text-gray-900 dark:text-white">Selected Files:</p>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
                          <div className="flex items-center space-x-2">
                            <FaFile className="text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {isSubmitting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Submitting...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || selectedFiles.length === 0}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaUpload />
                  <span>
                    {isSubmitting ? `Submitting... ${uploadProgress}%` : 
                     existingSubmission ? 'Update Submission' : 'Submit Assignment'}
                  </span>
                </button>
              </form>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmitForm;