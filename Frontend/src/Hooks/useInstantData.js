import { useState, useEffect, useContext } from 'react';
import { apiService } from '../services/apiService';
import UserContext from './UserContext';

export const useInstantData = (dataType, dependencies = []) => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        let result = null;

        switch (dataType) {
          case 'students':
            result = await apiService.getStudents(
              user.role === 'admin' ? null : user.department
            );
            break;
          case 'staff':
            result = await apiService.getStaff(
              user.role === 'admin' ? null : user.department
            );
            break;
          case 'papers':
            result = await apiService.getPapers();
            break;
          case 'attendance':
            if (user.role === 'admin') {
              // For admin, we'll need to handle this differently
              // For now, return empty array and let component handle it
              result = { attendanceReport: [] };
            } else if (user.department) {
              result = await apiService.getAttendance(user.department);
            }
            break;
          case 'certificates':
            result = await apiService.getCertificates(
              user.role === 'student' ? user._id : null
            );
            break;
          case 'quizzes':
            result = await apiService.getQuizzes();
            break;
          case 'assignments':
            result = await apiService.getAssignments();
            break;
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }

        setData(result);
        setError(null);
      } catch (err) {
        console.warn(`Failed to fetch ${dataType}:`, err.message);
        setError(err.message);
        // Don't show error immediately, keep trying in background
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dataType]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    setLoading(true);
    apiService.clearCache(dataType);
    // Trigger re-fetch by updating a dependency
  };

  return { data, loading, error, refresh };
};