// Vercel serverless function entry point
require('dotenv').config({ path: '../Backend/.env' });
const mongoose = require('mongoose');

// Connect to MongoDB
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    const dbUri = process.env.MONGODB_URI || "mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority";
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
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
};

// This is the main handler for Vercel serverless functions
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
    // Connect to database
    await connectDB();

    // Parse URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace('/api', '');
    
    console.log('Request path:', path, 'Method:', req.method);

    // Health check endpoint
    if (path === '/health' || path === '/') {
      return res.status(200).json({
        status: 'OK',
        message: 'Edutack API is running on Vercel',
        timestamp: new Date().toISOString(),
        environment: 'production',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        path: path,
        method: req.method
      });
    }

    // Staff login endpoint
    if (path === '/auth/login/staff' && req.method === 'POST') {
      const Staff = require('../Backend/models/Staff');
      const bcrypt = require('bcrypt');
      const Login = require('../Backend/models/Login');
      
      const { username, employeeId, email, password } = req.body;

      if ((!username && !employeeId && !email) || !password) {
        return res.status(400).json({ message: "Username, Employee ID, or Email and password are required" });
      }
      
      // Find staff by username, employeeId, or email
      let query = {};
      if (email) {
        query = { email };
      } else if (username) {
        query = { username };
      } else {
        query = { employeeId };
      }
      
      const staff = await Staff.findOne(query).exec();

      if (!staff) {
        return res.status(404).json({ message: "User not found" });
      }
      if (staff.role === 'teacher' && !staff.approved) {
        return res.status(403).json({ message: "User not approved by HOD" });
      }
      if (!staff.role) {
        return res.status(418).json({ message: "User not Approved" });
      }

      const match = await bcrypt.compare(password, staff.password);
      if (!match) return res.status(401).json({ message: "Incorrect Password" });
      
      // Track login
      await Login.create({ userId: staff._id, role: 'staff' });
      
      return res.status(200).json({
        _id: staff.id,
        name: staff.name,
        role: staff.role,
        userType: 'staff',
        department: staff.department,
        employeeId: staff.employeeId,
      });
    }

    // Student login endpoint
    if (path === '/auth/login/student' && req.method === 'POST') {
      const Student = require('../Backend/models/Student');
      const bcrypt = require('bcrypt');
      const Login = require('../Backend/models/Login');
      
      const { rollNo, email, password } = req.body;

      if ((!rollNo && !email) || !password) {
        return res.status(400).json({ message: "Roll No or Email and password are required" });
      }
      
      // Find student by rollNo or email
      const query = email ? { email } : { rollNo };
      const student = await Student.findOne(query).exec();

      if (!student) {
        return res.status(404).json({ message: "User not found" });
      }

      const match = await bcrypt.compare(password, student.password);
      if (!match) return res.status(401).json({ message: "Incorrect Password" });
      
      // Track login
      await Login.create({ userId: student._id, role: 'student' });
      
      return res.status(200).json({
        _id: student.id,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        rollNo: student.rollNo,
        role: "student",
        userType: "student"
      });
    }

    // For other endpoints, try to load the Express app
    const app = require('./server');
    app(req, res);

  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
  }
};