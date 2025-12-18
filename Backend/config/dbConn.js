const mongoose = require("mongoose");

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

const connectDB = async (retryCount = 0) => {
  const maxRetries = 4;
  try {
    const dbUri = process.env.MONGODB_URI || "mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority";
    
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000, // Increased timeout to 30s
      socketTimeoutMS: 60000, // Increased socket timeout to 60s
      connectTimeoutMS: 30000, // Connection timeout
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2, // Reduced minimum pool size
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000, // Check connection every 10s
      retryWrites: true,
    });
    console.log("✅ Connected to MongoDB Atlas successfully");
  } catch (err) {
    console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}/${maxRetries + 1}):`, err.message);
    
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      console.log(`🔄 Retrying connection in ${delay/1000} seconds...`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error("💥 Failed to connect to MongoDB after all retries");
      console.error("\n🔧 Troubleshooting steps:");
      console.error("1. 🌐 Check your internet connection");
      console.error("2. ⚡ Verify MongoDB Atlas cluster is running and not paused");
      console.error("3. 🔒 Check if your IP is whitelisted in MongoDB Atlas Network Access");
      console.error("4. 🔑 Verify username/password in connection string");
      console.error("5. 🏠 Try connecting from a different network");
      console.error("6. 📞 Check if your ISP blocks MongoDB Atlas ports");
      
      // Don't exit the process, let the app continue without DB for now
      console.log("⚠️  Server will continue running without database connection");
    }
  }
};

module.exports = connectDB;
