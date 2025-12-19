// Ultra minimal serverless API for Vercel deployment
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
    return res.status(200).json({
      status: 'OK',
      message: 'Ultra minimal Edutack API is working',
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};