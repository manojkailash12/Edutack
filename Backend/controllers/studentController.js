const Student = require("./../models/Student");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all Student
// @route GET /Student
// @access Private
const getStudent = asyncHandler(async (req, res) => {
  if (!req?.params?.id) return res.status(400).json({ message: "ID Missing" });

  const student = await Student.findById(req.params.id)
    .select("-password -_id -__v")
    .exec();
  if (!student) {
    return res.status(400).json({ message: "Student Not Found." });
  }
  res.json(student);
});

// @desc Get all Student
// @route GET /Student
// @access Private
const getAllStudents = asyncHandler(async (req, res) => {
  const students = await Student.find().select("-password").lean();
  if (!students?.length) {
    return res.status(400).json({ message: "No Students Found" });
  }
  res.json(students);
});

// @desc Create New Student
// @route POST /Student
// @access Private
const createNewStudent = asyncHandler(async (req, res) => {
  console.log('Received student registration body:', req.body);
  let { name, course, email, password, year, rollNo } = req.body;
  if (rollNo) rollNo = rollNo.trim();
  console.log('Creating new student:', req.body);

  // Confirm Data
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!email) missingFields.push('email');
  if (!course) missingFields.push('course');
  if (!password) missingFields.push('password');
  if (!year) missingFields.push('year');
  if (!req.body.section) missingFields.push('section');
  if (!rollNo) missingFields.push('rollNo');
  if (missingFields.length > 0) {
    console.error('Missing fields:', missingFields, 'Received:', req.body);
    return res.status(400).json({ message: `All fields are required. Missing: ${missingFields.join(', ')}` });
  }
  rollNo = rollNo.trim();
  if (!rollNo) {
    return res.status(400).json({ message: "Roll Number cannot be empty" });
  }

  // Validate academic year format
  const yearPattern = /^\d{4}-\d{4}$/;
  if (!yearPattern.test(year)) {
    return res.status(400).json({ message: "Year must be in the format YYYY-YYYY (e.g., 2025-2026)" });
  }

  // Check for Duplicates (rollNo)
  const rollNoDuplicate = await Student.findOne({ rollNo }).lean().exec();
  if (rollNoDuplicate) {
    return res.status(409).json({ message: "Duplicate Roll Number" });
  }

  // Hash Password
  const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

  const section = req.body.section;
  const studentObj = {
    rollNo,
    year,
    name,
    department: course, // Use course as department
    email,
    password: hashedPwd,
    section,
  };

  // Create and Store New student
  const student = await Student.create(studentObj);

  // Best-effort: assign to all papers for their department, year, and section (if any exist)
  if (student) {
    const Paper = require("../models/Paper");
    const papers = await Paper.find({
      department: student.department,
      year: student.year,
      sections: student.section
    });
    for (const paper of papers) {
      if (!paper.students.includes(student._id)) {
        paper.students.push(student._id);
        await paper.save();
      }
    }
    res.status(201).json({ message: `New Student ${name} created`, rollNo: student.rollNo });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Update Student
// @route PATCH /Student
// @access Private
const updateStudent = asyncHandler(async (req, res) => {
  const { id, name, email, rollNo, password, year, section } = req.body;

  // Confirm Data
  if (!id || !name || !email || !rollNo) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Find Student
  const student = await Student.findById(id).exec();

  if (!student) {
    return res.status(400).json({ message: "User not found" });
  }

  // Check for duplicate rollNo
  const duplicate = await Student.findOne({ rollNo }).lean().exec();

  // Allow Updates to original
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate Roll Number" });
  }

  // Track old year/section for paper reassignment
  const oldYear = student.year;
  const oldSection = student.section;
  const oldDepartment = student.department;

  student.name = name;
  student.email = email;
  student.rollNo = rollNo;
  if (year) student.year = year;
  if (section) student.section = section;

  if (password) {
    // Hash Pwd
    student.password = await bcrypt.hash(password, 10);
  }

  await student.save();

  // Reassign papers if year or section changed
  if ((year && year !== oldYear) || (section && section !== oldSection)) {
    const Paper = require("../models/Paper");
    // Remove student from old papers
    const oldPapers = await Paper.find({
      department: oldDepartment,
      year: oldYear,
      sections: oldSection
    });
    for (const paper of oldPapers) {
      paper.students = paper.students.filter(sid => sid.toString() !== student._id.toString());
      await paper.save();
    }
    // Add student to new papers
    const newPapers = await Paper.find({
      department: student.department,
      year: student.year,
      sections: student.section
    });
    for (const paper of newPapers) {
      if (!paper.students.includes(student._id)) {
        paper.students.push(student._id);
        await paper.save();
      }
    }
  }

  res.json({ message: "User Updated" });
});

// @desc Delete Student
// @route DELETE /Student
// @access Private
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Student ID required" });
  }

  const student = await Student.findById(id).exec();

  if (!student) {
    return res.status(400).json({ message: "Student not found" });
  }

  const result = await student.deleteOne();

  res.json({ message: `Student with rollNo ${result.rollNo} deleted` });
});

// @desc Get Students by Department
// @route GET /Student/department/:department
// @access Private
const getStudentsByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.params;
  if (!department) {
    return res.status(400).json({ message: "Department is required" });
  }
  const students = await Student.find({ department: department }).select("-password").lean();
  if (!students?.length) {
    return res.status(404).json({ message: "No Students Found for this Department" });
  }
  res.json(students);
});

const changeStudentPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { previousPassword, newPassword } = req.body;
  if (!id || !previousPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const student = await Student.findById(id).exec();
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }
  const match = await bcrypt.compare(previousPassword, student.password);
  if (!match) {
    return res.status(401).json({ message: "Previous password is incorrect" });
  }
  student.password = await bcrypt.hash(newPassword, 10);
  await student.save();
  res.json({ message: "Password changed successfully" });
});

// @desc Get Students by Paper (all sections)
// @route GET /students/paper/:paperId
const getStudentsByPaper = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  if (!paperId) {
    return res.status(400).json({ message: "Paper ID is required" });
  }
  const Paper = require("../models/Paper");
  const paper = await Paper.findById(paperId);
  if (!paper) {
    return res.status(404).json({ message: "Paper not found" });
  }
  // Find all students in any of the paper's sections
  const students = await Student.find({
    department: paper.department,
    year: paper.year,
    section: { $in: paper.sections }
  }).select('name rollNo email year section').lean();
  res.json(students);
});

// @desc Get Students by Paper and Section (for teachers)
// @route GET /students/paper/:paperId/:section
// @access Private
const getStudentsByPaperAndSection = asyncHandler(async (req, res) => {
  const { paperId, section } = req.params;
  if (process.env.NODE_ENV === 'development') {
    console.log(`=== getStudentsByPaperAndSection DEBUG ===`);
    console.log(`Paper ID: ${paperId}, Section: ${section}`);
  }
  
  if (!paperId || !section) {
    return res.status(400).json({ message: "Paper ID and Section are required" });
  }
  try {
    const Paper = require("../models/Paper");
    const paper = await Paper.findById(paperId);
    console.log(`Paper found:`, paper ? `${paper.paper} (${paper.sections.join(', ')})` : 'Not found');
    
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }
    
    console.log(`Paper students array length: ${paper.students.length}`);
    console.log(`Paper students IDs:`, paper.students);
    
    // Fetch students whose _id is in paper.students and section matches
    const students = await Student.find({
      _id: { $in: paper.students },
      section: section
    }).select('name rollNo email year section').lean();
    
    console.log(`Students found: ${students.length}`);
    console.log(`Students data:`, students);
    
    res.json(Array.isArray(students) ? students : []);
  } catch (err) {
    console.error('Error in getStudentsByPaperAndSection:', err);
    res.status(500).json({ message: "Error fetching students" });
  }
});

// @desc Get Teacher's Papers and Sections for Student List
// @route GET /students/teacher-papers/:teacherId
// @access Private
const getTeacherPapersForStudents = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    const Paper = require("../models/Paper");
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

// @desc Get Students by Section (for teachers)
// @route GET /students/section/:section
// @access Private
const getStudentsBySection = asyncHandler(async (req, res) => {
  const { section } = req.params;
  if (!section) {
    return res.status(400).json({ message: "Section is required" });
  }
  
  try {
    const students = await Student.find({ section })
      .select('name rollNo email year section department')
      .lean();
    
    if (!students?.length) {
      return res.status(404).json({ message: "No students found for this section" });
    }
    
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students" });
  }
});

// @desc Update Student Profile Photo
// @route PATCH /student/:id/profile-photo
// @access Private
const updateProfilePhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Student ID required" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Profile photo is required" });
  }

  try {
    const student = await Student.findById(id).exec();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Convert image to base64 for serverless storage
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
    
    student.profilePhoto = base64Image;
    const updatedStudent = await student.save();
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Profile photo updated successfully",
      profilePhoto: updatedStudent.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile photo", error: error.message });
  }
});

// @desc Delete Student Profile Photo
// @route DELETE /student/:id/profile-photo
// @access Private
const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Student ID required" });
  }

  try {
    const student = await Student.findById(id).exec();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Remove profile photo
    student.profilePhoto = undefined;
    const updatedStudent = await student.save();

    res.json({
      message: "Profile photo removed successfully",
      profilePhoto: updatedStudent.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: "Error removing profile photo", error: error.message });
  }
});

module.exports = {
  getStudent,
  getAllStudents,
  createNewStudent,
  updateStudent,
  deleteStudent,
  getStudentsByDepartment,
  changeStudentPassword,
  getStudentsByPaperAndSection,
  getTeacherPapersForStudents,
  getStudentsBySection,
  updateProfilePhoto,
  deleteProfilePhoto,
  getStudentsByPaper,
};
