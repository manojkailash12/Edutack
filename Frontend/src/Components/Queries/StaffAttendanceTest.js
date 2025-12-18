import React, { useContext, useState } from 'react';
import UserContext from '../../Hooks/UserContext';
import axios from '../../config/api/axios';

const StaffAttendanceTest = () => {
  const { user } = useContext(UserContext);
  const [apiTest, setApiTest] = useState(null);
  const [testing, setTesting] = useState(false);

  const testAPI = async () => {
    setTesting(true);
    try {
      const response = await axios.get('/staff-attendance/test');
      setApiTest({ success: true, data: response.data });
    } catch (error) {
      setApiTest({ 
        success: false, 
        error: error.message,
        details: error.response?.data || 'No response data'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Staff Attendance Test</h1>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">User Information</h2>
        <pre className="bg-gray-100 p-2 rounded text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-100 p-4 rounded mb-4">
        <p>If you can see this page and the user information above, the basic routing is working.</p>
        <p>User ID: {user?._id || 'Not found'}</p>
        <p>User Role: {user?.role || 'Not found'}</p>
        <p>User Name: {user?.name || 'Not found'}</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">API Test</h2>
        <button 
          onClick={testAPI}
          disabled={testing}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Staff Attendance API'}
        </button>
        
        {apiTest && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">API Test Result:</h3>
            <pre className={`p-2 rounded text-sm ${apiTest.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {JSON.stringify(apiTest, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAttendanceTest;