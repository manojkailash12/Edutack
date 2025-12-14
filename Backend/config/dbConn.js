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
  const maxRetries = 3;
  try {
    // Try different connection string formats
    const dbUri = process.env.MONGODB_URI || "mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority";
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}/${maxRetries + 1}):`, err.message);
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying connection in 2 seconds...`);
      setTimeout(() => connectDB(retryCount + 1), 2000);
    } else {
      console.error("💥 Failed to connect to MongoDB after all retries");
      console.error("Possible solutions:");
      console.error("1. Check your internet connection");
      console.error("2. Verify MongoDB Atlas cluster is running");
      console.error("3. Check if your IP is whitelisted in MongoDB Atlas");
      console.error("4. Verify the connection string is correct");
    }
  }
};

module.exports = connectDB;
