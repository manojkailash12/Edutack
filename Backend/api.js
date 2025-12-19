// Minimal serverless API for Vercel deployment
require('dotenv').config();

// Main serverless function handler
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
    // Parse URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    console.log('Request path:', path, 'Method:', req.method);

    // Health check endpoint
    if (path === '/' || path === '/health') {
      return res.status(200).json({
        status: 'OK',
        message: 'Edutack API is running on Vercel - Minimal Version',
        timestamp: new Date().toISOString(),
        environment: 'production',
        path: path,
        method: req.method
      });
    }

    // Test MongoDB connection
    if (path === '/test-db' && req.method === 'GET') {
      try {
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState === 0) {
          const dbUri = process.env.MONGODB_URI;
          await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            family: 4,
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
          });
        }
        
        return res.json({
          status: 'OK',
          message: 'MongoDB connection successful',
          connectionState: mongoose.connection.readyState
        });
      } catch (error) {
        return res.status(500).json({
          status: 'ERROR',
          message: 'MongoDB connection failed',
          error: error.message
        });
      }
    }

    // Test basic staff endpoint
    if (path === '/staff' && req.method === 'GET') {
      try {
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState === 0) {
          const dbUri = process.env.MONGODB_URI;
          await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            family: 4,
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
          });
        }
        
        const Staff = require('./models/Staff');
        const staff = await Staff.find().select('-password').lean();
        return res.json(staff);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching staff", 
          error: error.message,
          stack: error.stack
        });
      }
    }

    // For other endpoints, return 404
    return res.status(404).json({
      message: 'Endpoint not found - Minimal API',
      path: path,
      method: req.method,
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /test-db',
        'GET /staff'
      ]
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};