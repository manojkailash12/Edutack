const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // index of correct option
  marks: { type: Number, default: 1 }
});

const quizSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  answers: [{ type: Number }], // array of selected option indices
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: Number }, // in seconds
  attemptNumber: { type: Number, default: 1 }, // Track attempt number
  isAutoSubmitted: { type: Boolean, default: false }, // Track if auto-submitted due to time
});

const quizSchema = new mongoose.Schema({
  paper: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  title: { type: String, required: true },
  description: { type: String },
  section: {
    type: String,
    enum: ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'],
    default: null,
  },
  questions: [questionSchema],
  duration: { type: Number, required: true }, // in minutes
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  allowRetake: { type: Boolean, default: false }, // Allow students to retake
  maxAttempts: { type: Number, default: 1 }, // Maximum attempts allowed
  showResults: { type: Boolean, default: true }, // Show results immediately
  showCorrectAnswers: { type: Boolean, default: true }, // Show correct/wrong answers
  submissions: [quizSubmissionSchema],
  totalMarks: { type: Number, default: 0 },
}, { timestamps: true });

// Calculate total marks before saving
quizSchema.pre('save', function(next) {
  this.totalMarks = this.questions.reduce((total, question) => total + question.marks, 0);
  next();
});

module.exports = mongoose.model('Quiz', quizSchema); 