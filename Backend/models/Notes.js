const mongoose = require("mongoose");
// const AutoIncrement = require("mongoose-sequence")(mongoose);

// Notes for Student
const notesSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      enum: ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'],
      default: null,
    },
    attachment: {
      type: String, // file path or URL
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notes", notesSchema);
