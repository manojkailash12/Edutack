import React, { useState, useEffect } from 'react';
import axios from '../../config/api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loading from '../Layouts/Loading';
import { FaArrowLeft, FaEye } from 'react-icons/fa';

const SubmissionViewer = () => {
  const { type, id, assignmentId } = useParams(); // Handle both URL patterns
  const [submissions, setSubmissions] = useState([]);
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        let submissionsResponse, itemResponse;
        
        // Determine if this is from the new assignment route or the old generic route
        if (assignmentId) {
          // New route: /assignments/:assignmentId/submissions
          submissionsResponse = await axios.get(`/assignments/${assignmentId}/submissions`);
          itemResponse = await axios.get(`/assignments/assignment/${assignmentId}`);
        } else if (type === 'quiz') {
          submissionsResponse = await axios.get(`/quizzes/${id}/submissions`);
          itemResponse = await axios.get(`/quizzes/quiz/${id}`);
        } else if (type === 'assignment') {
          submissionsResponse = await axios.get(`/assignments/${id}/submissions`);
          itemResponse = await axios.get(`/assignments/assignment/${id}`);
        }
        
        setSubmissions(submissionsResponse.data || []);
        setItemDetails(itemResponse.data);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        toast.error('Error loading submissions');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmissions();
  }, [type, id, assignmentId, navigate]);

  const handleGradeSubmission = async (studentId, score, feedback = '') => {
    try {
      const currentId = assignmentId || id; // Use assignmentId if available, otherwise use id
      
      if (assignmentId || type === 'assignment') {
        await axios.post(`/assignments/${currentId}/grade`, {
          student: studentId,
          score,
          feedback
        });
        
        // Auto-refresh internal marks after grading assignment
        try {
          const paperId = itemDetails.paper?._id || itemDetails.paper;
          if (paperId) {
            console.log('Triggering internal marks refresh for paper:', paperId);
            // This will trigger the internal marks system to recalculate
            await axios.get(`/assignments/marks/${paperId}`);
          }
        } catch (internalErr) {
          console.warn('Could not refresh internal marks:', internalErr);
          // Don't fail the grading if internal marks refresh fails
        }
      } else if (type === 'quiz') {
        await axios.patch(`/quizzes/${currentId}/update-marks`, {
          student: studentId,
          marks: score,
          feedback
        });
      }
      
      toast.success('Submission graded successfully! Internal marks updated.');
      // Refresh submissions data without full page reload
      const fetchSubmissions = async () => {
        try {
          let submissionsResponse;
          const currentId = assignmentId || id;
          
          if (assignmentId || type === 'assignment') {
            submissionsResponse = await axios.get(`/assignments/${currentId}/submissions`);
          } else if (type === 'quiz') {
            submissionsResponse = await axios.get(`/quizzes/${currentId}/submissions`);
          }
          
          setSubmissions(submissionsResponse.data || []);
        } catch (err) {
          console.error('Error refreshing submissions:', err);
        }
      };
      
      await fetchSubmissions();
    } catch (err) {
      console.error('Error grading submission:', err);
      toast.error('Error grading submission');
    }
  };

  const handleMarkAsUngraded = async (studentId) => {
    try {
      const currentId = assignmentId || id;
      
      if (assignmentId || type === 'assignment') {
        // Reset grade by setting score to 0 and isGraded to false
        await axios.post(`/assignments/${currentId}/grade`, {
          student: studentId,
          score: 0,
          feedback: '',
          isGraded: false
        });
        
        // Auto-refresh internal marks after resetting grade
        try {
          const paperId = itemDetails.paper?._id || itemDetails.paper;
          if (paperId) {
            await axios.get(`/assignments/marks/${paperId}`);
          }
        } catch (internalErr) {
          console.warn('Could not refresh internal marks:', internalErr);
        }
      }
      
      toast.success('Submission marked as ungraded');
      // Refresh submissions data without full page reload
      const fetchSubmissions = async () => {
        try {
          const currentId = assignmentId || id;
          const submissionsResponse = await axios.get(`/assignments/${currentId}/submissions`);
          setSubmissions(submissionsResponse.data || []);
        } catch (err) {
          console.error('Error refreshing submissions:', err);
        }
      };
      
      await fetchSubmissions();
    } catch (err) {
      console.error('Error marking as ungraded:', err);
      toast.error('Error updating submission status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <Loading />;

  if (!itemDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {type === 'quiz' ? 'Quiz' : 'Assignment'} Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The {type} you're looking for could not be found.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <FaArrowLeft />
              <span>Back to {(assignmentId || type === 'assignment') ? 'Assignments' : 'Quizzes'}</span>
            </button>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {itemDetails.title} - Submissions
          </h1>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {(assignmentId || type === 'assignment') ? (
              <>
                <p>Due: {formatDate(itemDetails.dueDate)}</p>
                <p>Max Marks: {itemDetails.maxMarks}</p>
                <p>Description: {itemDetails.description}</p>
              </>
            ) : type === 'quiz' ? (
              <>
                <p>Duration: {itemDetails.duration} minutes</p>
                <p>Total Marks: {itemDetails.totalMarks}</p>
                <p>Start: {formatDate(itemDetails.startTime)}</p>
                <p>End: {formatDate(itemDetails.endTime)}</p>
              </>
            ) : null}
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Submissions ({submissions.length})
          </h2>
          
          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Student</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Roll No</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Submitted At</th>
                    {type === 'quiz' && (
                      <>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Time Taken</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Score</th>
                      </>
                    )}
                    {(assignmentId || type === 'assignment') && (
                      <>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Score</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Status</th>
                      </>
                    )}
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {submission.student?.name || 'Unknown'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {submission.student?.rollNo || 'N/A'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {formatDate(submission.submittedAt)}
                      </td>
                      {type === 'quiz' && (
                        <>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            {(() => {
                              const totalSeconds = submission.timeTaken || 0;
                              const minutes = Math.floor(totalSeconds / 60);
                              const seconds = totalSeconds % 60;
                              return minutes > 0 ? `${minutes} min ${seconds} sec` : `${seconds} sec`;
                            })()}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            <span className="font-semibold">
                              {submission.score || 0}/{itemDetails.totalMarks}
                            </span>
                          </td>
                        </>
                      )}
                      {(assignmentId || type === 'assignment') && (
                        <>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            <div className="space-y-2">
                              {/* Current Grade Display */}
                              {submission.isGraded && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs">
                                  <div className="font-semibold text-green-800 dark:text-green-200">
                                    Current: {submission.score}/{itemDetails.maxMarks}
                                  </div>
                                  {submission.feedback && (
                                    <div className="text-green-600 dark:text-green-400 mt-1">
                                      <strong>Feedback:</strong> {submission.feedback}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Editable Grading Interface */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={itemDetails.maxMarks}
                                    placeholder="Score"
                                    defaultValue={submission.isGraded ? submission.score : ''}
                                    className="w-16 px-2 py-1 border rounded text-sm"
                                    onChange={(e) => setGrading({
                                      ...grading,
                                      [submission.student._id]: {
                                        ...grading[submission.student._id],
                                        score: parseInt(e.target.value) || 0
                                      }
                                    })}
                                  />
                                  <span className="text-xs text-gray-500">/{itemDetails.maxMarks}</span>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="Feedback (optional)"
                                    defaultValue={submission.isGraded ? submission.feedback : ''}
                                    className="w-full px-2 py-1 border rounded text-xs"
                                    onChange={(e) => setGrading({
                                      ...grading,
                                      [submission.student._id]: {
                                        ...grading[submission.student._id],
                                        feedback: e.target.value
                                      }
                                    })}
                                  />
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleGradeSubmission(
                                      submission.student._id,
                                      grading[submission.student._id]?.score || submission.score || 0,
                                      grading[submission.student._id]?.feedback || submission.feedback || ''
                                    )}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 flex-1"
                                  >
                                    {submission.isGraded ? 'Update' : 'Grade'}
                                  </button>
                                  {submission.isGraded && (
                                    <button
                                      onClick={() => handleMarkAsUngraded(submission.student._id)}
                                      className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700"
                                      title="Mark as Ungraded"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            <div className="space-y-1">
                              <span className={`px-2 py-1 rounded text-xs block text-center ${
                                submission.isGraded 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
                              }`}>
                                {submission.isGraded ? 'Graded' : 'Pending'}
                              </span>
                            </div>
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <div className="flex flex-col space-y-1">
                          {(assignmentId || type === 'assignment') && submission.attachments && submission.attachments.length > 0 ? (
                            submission.attachments.map((filePath, fileIndex) => {
                              const fileName = filePath.split('/').pop();
                              const fileExtension = fileName.split('.').pop().toLowerCase();
                              const isPDF = fileExtension === 'pdf';
                              
                              return (
                                <button
                                  key={fileIndex}
                                  onClick={() => {
                                    // Open file in new tab
                                    const fileUrl = `${axios.defaults.baseURL}${filePath}`;
                                    window.open(fileUrl, '_blank');
                                  }}
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs"
                                  title={`${isPDF ? 'View' : 'Download'} ${fileName}`}
                                >
                                  <FaEye />
                                  <span className="truncate max-w-20">{fileName}</span>
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-gray-500 text-xs">No files</span>
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
      </div>
    </div>
  );
};

export default SubmissionViewer;