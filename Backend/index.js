// Serverless function that uses the comprehensive API
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    // Use the comprehensive API instead of server.js
    const apiHandler = require('./api');
    return await apiHandler(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};