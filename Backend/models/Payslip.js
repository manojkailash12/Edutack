const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  salaryDetails: {
    baseSalary: {
      type: Number,
      required: true
    },
    salaryType: {
      type: String,
      enum: ['fixed', 'attendance-based'],
      default: 'fixed'
    },
    dailyRate: {
      type: Number,
      default: 0
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    workingDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    totalWorkingHours: {
      type: Number,
      default: 0
    }
  },
  earnings: {
    basicSalary: {
      type: Number,
      required: true
    },
    allowances: {
      type: Number,
      default: 0
    },
    overtime: {
      type: Number,
      default: 0
    },
    bonus: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      required: true
    }
  },
  deductions: {
    tax: {
      type: Number,
      default: 0
    },
    providentFund: {
      type: Number,
      default: 0
    },
    insurance: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    }
  },
  netSalary: {
    type: Number,
    required: true
  },
  pdfPath: {
    type: String,
    default: null
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'sent'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Compound index to ensure one payslip per staff per month/year
payslipSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);