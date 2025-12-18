// Production-specific configurations
module.exports = {
  // File upload settings for serverless
  uploadPath: process.env.NODE_ENV === 'production' ? '/tmp' : './uploads',
  
  // Email settings
  emailTimeout: 30000, // 30 seconds for production
  
  // PDF generation settings
  pdfTimeout: 20000, // 20 seconds for PDF generation
  
  // Memory optimization
  maxFileSize: '10mb',
  
  // CORS settings
  corsOrigins: [
    'https://edutack.vercel.app',
    'https://edutack-git-main-manojkailash12s-projects.vercel.app',
    'https://edutack-manojkailash12s-projects.vercel.app'
  ]
};