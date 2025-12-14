const Notes = require("./../models/Notes");
const Paper = require("../models/Paper");
const asyncHandler = require("express-async-handler");

// @desc Get Notes for each Paper (filtered by section for teachers)
// @route GET /Notes/:paperId/:section?
// @access Everyone
const getNotes = async (req, res) => {
  if (!req?.params?.paperId) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }
  
  try {
    let notes;
    if (req.params.section) {
      // For students/teachers - filter by paper and section
      const paper = await Paper.findById(req.params.paperId);
      if (!paper || !paper.sections.includes(req.params.section)) {
        return res.status(404).json({ message: "Paper or section not found" });
      }
      
      console.log(`Searching for notes: paper=${req.params.paperId}, section=${req.params.section}`);
      
      // Find notes for this section OR notes without section (general notes)
      notes = await Notes.find({
        paper: req.params.paperId,
        $or: [
          { section: req.params.section },
          { section: null },
          { section: { $exists: false } }
        ]
      }).exec();
      
      console.log(`Found ${notes.length} notes for section ${req.params.section}`);
    } else {
      // For HODs/Admins - get all notes for the paper
      notes = await Notes.find({
        paper: req.params.paperId,
      }).exec();
    }
    
    if (!notes.length) {
      console.log(`No notes found for paper ${req.params.paperId}, section ${req.params.section || 'all'}`);
      return res.status(404).json({
        message: `No Notes found`,
      });
    }
    
    console.log(`Returning ${notes.length} notes`);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notes" });
  }
};

// @desc Get Teacher's Papers and Sections for Notes
// @route GET /notes/teacher-papers/:teacherId
// @access Private
const getTeacherPapersForNotes = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    const papers = await Paper.find({ teacher: teacherId })
      .select('paper sections department semester year')
      .lean();
    
    if (!papers?.length) {
      return res.status(404).json({ message: "No papers assigned to this teacher" });
    }
    
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching teacher papers" });
  }
});

// @desc Get single Note by ID
// @route GET /notes/:noteId
// @access Everyone
const getNote = async (req, res) => {
  if (!req?.params?.noteId) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }

  // Validate noteId format
  if (!req.params.noteId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: "Invalid note ID format" });
  }

  try {
    const note = await Notes.findById(req.params.noteId).populate('paper', 'paper sections').exec();
    if (!note) {
      return res.status(404).json({
        message: "Note Not Found",
      });
    }
    console.log('Found note:', note.title, 'ID:', note._id);
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: "Error fetching note: " + error.message });
  }
};

// @desc Add Notes (with section for teachers)
// @route POST /Notes
// @access Private
const addNotes = asyncHandler(async (req, res) => {
  const { paper, title, body, section } = req.body;
  console.log('Creating new note:', req.body);

  // Confirm Data
  if (!paper || !title || !body) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Fields Missing" });
  }

  // For teachers, validate section
  if (section) {
    const paperDoc = await Paper.findById(paper);
    if (!paperDoc || !paperDoc.sections.includes(section)) {
      return res.status(400).json({ message: "Invalid section for this paper" });
    }
  }

  const NotesObj = {
    paper,
    title,
    body,
    section: section || null,
  };

  // Create and Store New Note
  const record = await Notes.create(NotesObj);

  if (record) {
    res.status(201).json({
      message: `Note Added Successfully`,
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Update Notes (with section for teachers)
// @route PATCH /notes/:noteId
// @access Private
const updateNotes = asyncHandler(async (req, res) => {
  const noteId = req.params.noteId; // Get ID from URL parameter
  const { paper, title, body, section } = req.body;

  console.log('=== UPDATE NOTES DEBUG ===');
  console.log('Note ID:', noteId);
  console.log('Request body:', req.body);

  // Validate noteId format
  if (!noteId || !noteId.match(/^[0-9a-fA-F]{24}$/)) {
    console.log('Invalid note ID format:', noteId);
    return res.status(400).json({ message: "Invalid note ID format" });
  }

  // Confirm Data
  if (!paper || !title || !body) {
    console.log('Missing required fields:', { paper: !!paper, title: !!title, body: !!body });
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Find Record
    console.log(`Updating note with ID: ${noteId}`);
    const record = await Notes.findById(noteId).exec();

    if (!record) {
      console.log(`Note not found with ID: ${noteId}`);
      return res.status(404).json({ message: "Note doesn't exist" });
    }
    
    console.log(`Found note: ${record.title}`);

    // For teachers, validate section
    if (section) {
      const paperDoc = await Paper.findById(paper);
      if (!paperDoc || !paperDoc.sections.includes(section)) {
        return res.status(400).json({ message: "Invalid section for this paper" });
      }
    }

    console.log('Updating note fields:', { 
      oldTitle: record.title, 
      newTitle: title,
      oldSection: record.section,
      newSection: section 
    });

    record.title = title;
    record.body = body;
    record.section = section || null;
    record.paper = paper; // Ensure paper is updated too

    const save = await record.save();
    if (save) {
      console.log('Note updated successfully');
      res.json({
        message: `Note Updated Successfully`,
      });
    } else {
      console.log('Note save failed');
      res.json({ message: "Save Failed" });
    }
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: "Error updating note: " + error.message });
  }
});

// @desc Delete Note
// @route DELETE /Note
// @access Private
const deleteNotes = asyncHandler(async (req, res) => {
  if (!req.params.noteId) {
    return res.status(400).json({ message: "Note ID required" });
  }

  const record = await Notes.findById(req.params.noteId).exec();

  if (!record) {
    return res.status(404).json({ message: "Note not found" });
  }

  await record.deleteOne();

  res.json({
    message: `Note Deleted`,
  });
});

// @desc Upload Note Attachment (PDF with no size limit)
// @route POST /notes/paper/:paperId/upload
// @access Private (teacher)
const uploadNoteAttachment = asyncHandler(async (req, res) => {
  const { title, body, section } = req.body;
  const paper = req.params.paperId;
  
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  if (!paper || !title || !body) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // For teachers, validate section
  if (section) {
    const paperDoc = await Paper.findById(paper);
    if (!paperDoc || !paperDoc.sections.includes(section)) {
      return res.status(400).json({ message: "Invalid section for this paper" });
    }
  }

  const attachment = `/uploads/notes/${req.file.filename}`;
  const note = await Notes.create({ 
    paper, 
    title, 
    body, 
    section: section || null,
    attachment 
  });
  
  if (note) {
    res.status(201).json({ 
      message: 'Note uploaded successfully', 
      note: {
        _id: note._id,
        title: note.title,
        attachment: note.attachment
      }
    });
  } else {
    res.status(400).json({ message: 'Failed to save note' });
  }
});

// @desc Download Note Attachment
// @route GET /notes/download/:noteId
// @access Private
const downloadNoteAttachment = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  
  if (!noteId) {
    return res.status(400).json({ message: 'Note ID required' });
  }

  const note = await Notes.findById(noteId);
  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  if (!note.attachment) {
    return res.status(404).json({ message: 'No attachment found for this note' });
  }

  const path = require('path');
  const fs = require('fs');
  
  // Construct the file path more reliably
  const filePath = path.join(__dirname, '..', 'public', note.attachment);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found on server' });
  }

  // Extract original filename from the attachment path
  let originalFileName = path.basename(note.attachment);
  
  // If the filename has timestamp prefix, extract the original name
  if (originalFileName.includes('-')) {
    const parts = originalFileName.split('-');
    if (parts.length > 1) {
      // Remove timestamp prefix (first part) and rejoin the rest
      originalFileName = parts.slice(1).join('-');
    }
  }
  
  console.log('Downloading file:', { 
    filePath, 
    storedPath: note.attachment,
    extractedFilename: originalFileName 
  });
  
  // Set proper headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
  
  // Set proper content type based on file extension
  const ext = path.extname(originalFileName).toLowerCase();
  let contentType = 'application/octet-stream';
  
  switch (ext) {
    case '.pdf':
      contentType = 'application/pdf';
      break;
    case '.doc':
      contentType = 'application/msword';
      break;
    case '.docx':
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.txt':
      contentType = 'text/plain';
      break;
    case '.ppt':
      contentType = 'application/vnd.ms-powerpoint';
      break;
    case '.pptx':
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      break;
  }
  
  res.setHeader('Content-Type', contentType);
  
  res.download(filePath, originalFileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
    }
  });
});

// @desc Get Notes for Students by Section
// @route GET /notes/student/:section
// @access Private (students)
const getNotesForStudent = asyncHandler(async (req, res) => {
  const { section } = req.params;
  const { department, year } = req.query;
  
  if (!section || !department || !year) {
    return res.status(400).json({ message: "Section, department, and year are required" });
  }
  
  try {
    // Find all papers for this department, year, and section
    const papers = await Paper.find({
      department,
      year,
      sections: section
    }).select('_id paper').lean();
    
    if (!papers.length) {
      return res.status(404).json({ message: "No papers found for this section" });
    }
    
    // Get all notes for these papers in this section
    const notes = await Notes.find({
      paper: { $in: papers.map(p => p._id) },
      section: section
    }).populate('paper', 'paper').sort({ createdAt: -1 }).lean();
    
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notes for student", error: err.message });
  }
});

module.exports = {
  getNotes,
  getNote,
  addNotes,
  updateNotes,
  deleteNotes,
  uploadNoteAttachment,
  downloadNoteAttachment,
  getTeacherPapersForNotes,
  getNotesForStudent,
};
