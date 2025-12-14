const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true); // Allow all origins for development
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
