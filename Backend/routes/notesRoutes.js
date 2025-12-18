const express = require("express");
const router = express.Router();
const notesController = require("./../controllers/notesController");
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads (no size limit, only PDF/DOCX)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/notes'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx' && ext !== '.doc') {
      return cb(new Error('Only PDF and DOC/DOCX files are allowed'));
    }
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/notes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router
  .route("/:noteId")
  .get(notesController.getNote)
  .patch(notesController.updateNotes)
  .delete(notesController.deleteNotes);

router
  .route("/paper/:paperId")
  .get(notesController.getNotes)
  .post(notesController.addNotes);

router
  .route("/paper/:paperId/:section")
  .get(notesController.getNotes);

router.get("/teacher-papers/:teacherId", notesController.getTeacherPapersForNotes);
router.get("/student/:section", notesController.getNotesForStudent);
router.get("/download/:noteId", notesController.downloadNoteAttachment);
router.post('/paper/:paperId/upload', upload.single('attachment'), notesController.uploadNoteAttachment);

module.exports = router;
