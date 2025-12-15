import { useState, useEffect } from 'react';
import axios from '../../config/api/axios';

const ApiHealthCheck = () => {
  const [status, setStatus] = useState('checking');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        setApiUrl(axios.defaults.baseURL);
        console.log('Testing API connection to:', axios.defaults.baseURL);
        
        const response = await axios.get('/health');
        console.log('Health check response:', response.data);
        setStatus('connected');
        setError('');
      } catch (err) {
        console.error('Health check failed:', err);
        setStatus('failed');
        setError(err.message || 'Connection failed');
      }
    };

    checkApiHealth();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '✅';
      case 'failed': return '❌';
      default: return '🔄';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold mb-2">API Connection Status</h3>
      <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
        <span>{getStatusIcon()}</span>
        <span className="capitalize">{status}</span>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        <div>URL: {apiUrl}</div>
        {error && <div className="text-red-500 mt-1">Error: {error}</div>}
      </div>
    </div>
  );
};

export default ApiHealthCheck;