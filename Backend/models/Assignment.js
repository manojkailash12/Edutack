const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  content: { type: String, required: false }, // Assignment answer/content (optional)
  attachments: [{ type: String }], // File paths for uploaded files
  score: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  isGraded: { type: Boolean, default: false },
  attemptNumber: { type: Number, default: 1 }, // Track attempt number
});

const assignmentSchema = new mongoose.Schema({
  paper: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String },
  section: {
    type: String,
    enum: ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'],
    default: null,
  },
  dueDate: { type: Date, required: true },
  maxMarks: { type: Number, required: true, default: 10 },
  allowLateSubmission: { type: Boolean, default: false },
  allowRetake: { type: Boolean, default: false }, // Allow students to resubmit
  maxAttempts: { type: Number, default: 1 }, // Maximum attempts allowed
  attachments: [{ type: String }], // Teacher's reference files
  isActive: { type: Boolean, default: true },
  submissions: [assignmentSubmissionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);