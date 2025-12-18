const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
    default: "2025-2026"
  },
  semester: {
    type: String,
    required: true,
    enum: ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"]
  },
  subjects: [{
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true
    },
    internalMarks: {
      type: Number,
      min: 0,
      max: 60,
      required: true
    },
    externalMarks: {
      type: Number,
      min: 0,
      max: 40,
      required: true
    },
    totalMarks: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C", "F"],
      required: true
    }
  }],
  overallGrade: {
    type: String,
    enum: ["A+", "A", "B+", "B", "C", "F"],
    required: true
  },
  overallPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  certificatePath: {
    type: String,
    default: null
  },
  generatedDate: {
    type: Date,
    default: Date.now
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["draft", "generated", "distributed"],
    default: "draft"
  }
}, {
  timestamps: true,
});

// Index for efficient querying
certificateSchema.index({ student: 1, academicYear: 1, semester: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ generatedDate: -1 });

// Calculate total marks before validation and saving
certificateSchema.pre('validate', function(next) {
  console.log('=== CERTIFICATE PRE-SAVE MIDDLEWARE ===');
  console.log('Subjects array length:', this.subjects ? this.subjects.length : 0);
  console.log('Subjects data:', this.subjects);
  
  if (this.subjects && this.subjects.length > 0) {
    console.log('Processing subjects for overall calculation...');
    
    // Calculate total marks for each subject
    this.subjects.forEach((subject, index) => {
      subject.totalMarks = subject.internalMarks + subject.externalMarks;
      
      // Calculate grade based on total marks
      if (subject.totalMarks >= 90) subject.grade = "A+";
      else if (subject.totalMarks >= 80) subject.grade = "A";
      else if (subject.totalMarks >= 70) subject.grade = "B+";
      else if (subject.totalMarks >= 60) subject.grade = "B";
      else if (subject.totalMarks >= 50) subject.grade = "C";
      else subject.grade = "F";
      
      console.log(`Subject ${index + 1}: Internal=${subject.internalMarks}, External=${subject.externalMarks}, Total=${subject.totalMarks}, Grade=${subject.grade}`);
    });
    
    // Calculate overall percentage and grade
    const totalMarks = this.subjects.reduce((sum, subject) => sum + subject.totalMarks, 0);
    const maxMarks = this.subjects.length * 100;
    this.overallPercentage = (totalMarks / maxMarks) * 100;
    
    console.log(`Overall calculation: ${totalMarks}/${maxMarks} = ${this.overallPercentage}%`);
    
    // Calculate overall grade
    if (this.overallPercentage >= 90) this.overallGrade = "A+";
    else if (this.overallPercentage >= 80) this.overallGrade = "A";
    else if (this.overallPercentage >= 70) this.overallGrade = "B+";
    else if (this.overallPercentage >= 60) this.overallGrade = "B";
    else if (this.overallPercentage >= 50) this.overallGrade = "C";
    else this.overallGrade = "F";
    
    console.log(`Overall grade: ${this.overallGrade}`);
    console.log(`Overall percentage: ${this.overallPercentage}`);
  } else {
    console.log('No subjects found - cannot calculate overall marks');
  }
  
  next();
});

module.exports = mongoose.model("Certificate", certificateSchema);