// Vercel serverless function - completely simplified approach
require('dotenv').config({ path: '../Backend/.env' });

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Parse the URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api', '');
    
    console.log('🔍 Request:', req.method, path);

    // Simple health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({
        status: 'OK',
        message: 'Edutack API is running on Vercel',
        timestamp: new Date().toISOString(),
        path: path,
        method: req.method
      });
    }

    // Handle login without database for now - just return success
    if (path === '/auth/login/staff' && req.method === 'POST') {
      console.log('🔐 Staff login attempt');
      
      // For now, return a mock successful response to test if the issue is with the API or the frontend
      return res.status(200).json({
        _id: 'test123',
        name: 'Test User',
        role: 'admin',
        userType: 'staff',
        department: 'Computer Science',
        employeeId: 'EMP001',
      });
    }

    if (path === '/auth/login/student' && req.method === 'POST') {
      console.log('🔐 Student login attempt');
      
      // For now, return a mock successful response
      return res.status(200).json({
        _id: 'student123',
        name: 'Test Student',
        department: 'Computer Science',
        year: '2024',
        section: 'A',
        rollNo: 'CS001',
        role: 'student',
        userType: 'student'
      });
    }

    // For any other endpoint, return 404
    return res.status(404).json({
      message: 'Endpoint not found',
      path: path,
      method: req.method
    });

  } catch (error) {
    console.error('❌ Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};