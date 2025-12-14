const { mongoose } = require("mongoose");
const Paper = require("./../models/Paper");
const asyncHandler = require("express-async-handler");

// @desc Get Papers for each Staff
// @route GET /Paper/staff/staffId
// @access Everyone
const getPapersStaff = asyncHandler(async (req, res) => {
  if (!req?.params?.staffId) {
    return res.status(400).json({ message: "Staff ID Missing" });
  }
  

  

  
  // Try both string and ObjectId formats
  const mongoose = require('mongoose');
  let papers;
  
  try {
    // First try as ObjectId
    const objectId = new mongoose.Types.ObjectId(req.params.staffId);
    papers = await Paper.find({
      teacher: objectId,
    })
      .select("-students")
      .exec();

  } catch (err) {

    // If ObjectId conversion fails, try as string
    papers = await Paper.find({
      teacher: req.params.staffId,
    })
      .select("-students")
      .exec();

  }
    

  
  // If no papers found, let's also check if this teacher exists in any papers
  if (!papers || papers.length === 0) {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(req.params.staffId);

    
    return res.status(404).json({
      message: `No Paper(s) found for this teacher`,
    });
  }

  res.json(papers);
});

// @desc Get Papers for each Student
// @route GET /paper/student/:studentId
// @access Everyone
const getPapersStudent = asyncHandler(async (req, res) => {
  if (!req?.params?.studentId) {
    return res.status(400).json({ message: "Student ID Missing" });
  }
  const papers = await Paper.find({
    students: req.params.studentId
  }).populate('teacher', 'name').lean();
  if (!papers || papers.length === 0) {
    return res.status(404).json({
      message: `No Paper(s) found`,
    });
  }
  res.json(papers);
});

// @desc Get All Papers
// @route GET /paper/
// @access Everyone
const getAllPapers = asyncHandler(async (req, res) => {
  if (!req?.params?.studentId) {
    return res.status(400).json({ message: "Student ID Missing" });
  }

  const papers = await Paper.aggregate([
    {
      $lookup: {
        from: "staffs",
        localField: "teacher",
        foreignField: "_id",
        as: "teacher",
      },
    },
    {
      $unwind: "$teacher",
    },
    {
      $project: {
        semester: 1,
        year: 1,
        paper: 1,
        "teacher.name": 1,
        students: 1,
        department: 1,
        joined: {
          $in: [new mongoose.Types.ObjectId(req.params.studentId), "$students"],
        },
      },
    },
  ]);
  if (!papers) {
    return res.status(404).json({
      message: `No Paper(s) found`,
    });
  }
  res.json(papers);
});

// @desc Get Students for each paper
// @route GET /paper/students/:paperId
// @access Private
const getStudentsList = asyncHandler(async (req, res) => {
  if (!req?.params?.paperId) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }

  try {
    // First get the paper details
    const paper = await Paper.findById(req.params.paperId)
      .select("department year sections students")
      .exec();
    
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    console.log('Paper details:', {
      department: paper.department,
      year: paper.year,
      sections: paper.sections,
      enrolledStudents: paper.students?.length || 0
    });

    let students = [];

    // First try to get students from the paper's students array (if they are enrolled)
    if (paper.students && paper.students.length > 0) {
      const enrolledStudents = await Paper.findById(req.params.paperId)
        .select("students")
        .populate({ path: "students", select: "name rollNo section year department" })
        .exec();
      students = enrolledStudents.students || [];
      console.log('Found enrolled students:', students.length);
    }

    // If no enrolled students found, find students by department, year, and sections
    if (students.length === 0) {
      console.log('No enrolled students, searching by department/year/sections');
      const Student = require('../models/Student');
      
      students = await Student.find({
        department: paper.department,
        year: paper.year,
        section: { $in: paper.sections }
      })
      .select("name rollNo section year department")
      .sort({ rollNo: 1 })
      .exec();
      
      console.log('Found students by criteria:', students.length);
    }

    if (!students || students.length === 0) {
      return res.status(404).json({ message: "No Students Found" });
    }

    // Sort students by roll number
    students.sort((a, b) => {
      const rollA = a.rollNo || "";
      const rollB = b.rollNo || "";
      const numA = parseInt(rollA.replace(/\D/g, '')) || 0;
      const numB = parseInt(rollB.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students list:', error);
    res.status(500).json({ message: "Error fetching students list" });
  }
});

// @desc Get Paper
// @route GET /Paper
// @access Everyone
const getPaper = asyncHandler(async (req, res) => {
  if (!req?.params?.paperId) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }
  const paper = await Paper.findOne({
    _id: req.params.paperId,
  })
    .populate({ path: "teacher", select: "name" })
    .populate({ path: "students", select: "name" })
    .exec();
  if (!paper) {
    return res.status(404).json({
      message: `No Paper(s) found`,
    });
  }
  res.json(paper);
});

// @desc Add Paper
// @route POST /Paper
// @access Private
const addPaper = asyncHandler(async (req, res) => {
  const { department, semester, year, paper, students, teacher, sections } = req.body;
  console.log('Creating new paper:', req.body);
  // Confirm Data
  if (!department || !paper || !semester || !year || !teacher || !sections || sections.length === 0) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Fields Missing (including sections)" });
  }

  // Check for Duplicates
  const duplicate = await Paper.findOne({
    department: req.body.department,
    paper: req.body.paper,
    teacher: req.body.teacher,
    semester: req.body.semester,
    sections: { $in: req.body.sections }
  })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Paper already exists for these sections" });
  }

  const PaperObj = {
    department,
    semester,
    paper,
    year,
    students: students || [],
    teacher,
    sections: req.body.sections,
  };

  // Create and Store New paper
  const record = await Paper.create(PaperObj);

  if (record) {
    // Automatically assign students to this paper based on department, year, and sections
    const Student = require("../models/Student");
    try {
      const matchingStudents = await Student.find({
        department: department,
        year: year,
        section: { $in: sections }
      }).select('_id');

      if (matchingStudents.length > 0) {
        record.students = matchingStudents.map(s => s._id);
        await record.save();
        console.log(`✅ Auto-assigned ${matchingStudents.length} students to paper ${paper}`);
      }
    } catch (err) {
      console.error('Error auto-assigning students:', err);
      // Don't fail the paper creation if student assignment fails
    }

    res.status(201).json({
      message: `New Paper ${req.body.paper} added with ${record.students.length} students auto-assigned`,
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Update Paper
// @route PATCH /Paper
// @access Private
const updateStudents = asyncHandler(async (req, res) => {
  const { id, students } = req.body;

  // Confirm Data
  if (!id || !students) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Find Record
  const record = await Paper.findById(id).exec();

  if (!record) {
    return res.status(404).json({ message: "Paper doesn't exist" });
  }

  record.students = students;

  const save = await record.save();
  if (save) {
    res.json({ message: "Updated" });
  } else {
    res.json({ message: "Save Failed" });
  }
});

// @desc Delete Paper
// @route DELETE /Paper
// @access Private
const deletePaper = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Paper ID required" });
  }

  const record = await Paper.findById(id).exec();

  if (!record) {
    return res.status(404).json({ message: "Paper not found" });
  }

  await record.deleteOne();

  res.json({ message: `${paper} deleted` });
});

// @desc Get Papers by Department
// @route GET /paper/department/:department
// @access Everyone
const getPapersByDepartment = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department Missing" });
  }
  const papers = await Paper.find({ department: req.params.department }).exec();
  if (!papers || papers.length === 0) {
    return res.status(404).json({ message: `No Paper(s) found for this department` });
  }
  res.json(papers);
});

// @desc Get Papers for a Section
// @route GET /paper/section/:department/:year/:section
// @access Everyone
const getPapersBySection = asyncHandler(async (req, res) => {
  const { department, year, section } = req.params;
  if (!department || !year || !section) {
    return res.status(400).json({ message: "Department, year, and section are required" });
  }
  const papers = await Paper.find({
    department,
    year,
    sections: section
  }).populate('teacher', 'name').lean();
  if (!papers || papers.length === 0) {
    return res.status(404).json({ message: `No Paper(s) found for this section` });
  }
  res.json(papers);
});

// @desc Debug endpoint to check database state
// @route GET /paper/debug/all
// @access Everyone
const debugPapers = asyncHandler(async (req, res) => {
  try {
    const papers = await Paper.find({}).populate('teacher', 'name role').exec();
    const Staff = require('../models/Staff');
    const allStaff = await Staff.find({}).select('name role department').exec();
    
    res.json({
      totalPapers: papers.length,
      papers: papers.map(p => ({
        paper: p.paper,
        teacher: p.teacher ? { id: p.teacher._id, name: p.teacher.name, role: p.teacher.role } : null,
        sections: p.sections,
        department: p.department
      })),
      totalStaff: allStaff.length,
      staff: allStaff.map(s => ({
        id: s._id,
        name: s.name,
        role: s.role,
        department: s.department
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  addPaper,
  getAllPapers,
  getPapersStaff,
  getPapersStudent,
  getPapersBySection, // NEW
  getStudentsList,
  getPaper,
  updateStudents,
  deletePaper,
  getPapersByDepartment, // NEW
  debugPapers, // DEBUG
};
