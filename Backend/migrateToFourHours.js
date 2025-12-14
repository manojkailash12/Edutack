const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Migration script to remove hours 5 and 6 from existing timetable data
const migrateToFourHours = async () => {
  try {
    await connectDB();
    
    const TimeSchedule = require("./models/TimeSchedule");
    
    console.log("Starting migration to 4-hour timetable system...");
    
    // Find all schedules with hours 5 and 6
    const schedulesToRemove = await TimeSchedule.find({
      hour: { $in: ['5', '6'] }
    });
    
    console.log(`Found ${schedulesToRemove.length} schedules with hours 5 and 6 to remove`);
    
    if (schedulesToRemove.length > 0) {
      // Log the schedules that will be removed
      console.log("Schedules to be removed:");
      schedulesToRemove.forEach(schedule => {
        console.log(`- ${schedule.department} ${schedule.semester} ${schedule.year} - ${schedule.day} Hour ${schedule.hour} Section ${schedule.section}`);
      });
      
      // Remove schedules with hours 5 and 6
      const result = await TimeSchedule.deleteMany({
        hour: { $in: ['5', '6'] }
      });
      
      console.log(`Successfully removed ${result.deletedCount} schedules`);
    } else {
      console.log("No schedules with hours 5 and 6 found. Migration not needed.");
    }
    
    // Verify the migration
    const remainingSchedules = await TimeSchedule.find({});
    const hourCounts = {};
    
    remainingSchedules.forEach(schedule => {
      hourCounts[schedule.hour] = (hourCounts[schedule.hour] || 0) + 1;
    });
    
    console.log("Current hour distribution after migration:");
    Object.keys(hourCounts).sort().forEach(hour => {
      console.log(`Hour ${hour}: ${hourCounts[hour]} schedules`);
    });
    
    console.log("Migration completed successfully!");
    
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the migration
if (require.main === module) {
  migrateToFourHours();
}

module.exports = migrateToFourHours;