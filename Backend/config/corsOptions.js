const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from Netlify frontend and localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'https://warm-marzipan-736407.netlify.app', // Your current Netlify URL
      /\.netlify\.app$/ // Any Netlify domain
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    callback(null, isAllowed);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
