// Test script to verify PDF marks data handling
const testMarksData = [
  {
    paper: 'CRT',
    subject: 'CRT',
    midMarks: 30,
    lab: 10,
    assignmentQuiz: 10,
    attendance: 10,
    total: 60,
    marks: {
      midMarks: 30,
      lab: 10,
      assignmentQuiz: 10,
      attendance: 10,
      total: 60
    }
  },
  {
    paper: 'DL',
    subject: 'Deep Learning',
    midMarks: 25,
    lab: 8,
    assignmentQuiz: 9,
    attendance: 8,
    total: 50,
    marks: {
      midMarks: 0, // This should be ignored in favor of direct properties
      lab: 0,
      assignmentQuiz: 0,
      attendance: 0,
      total: 0
    }
  }
];

console.log('Testing PDF marks data handling...');

testMarksData.forEach((subject, index) => {
  console.log(`\nTest ${index + 1}: ${subject.paper}`);
  
  // Old logic (incorrect)
  const oldMarks = subject.marks || subject;
  console.log('Old logic result:', {
    midMarks: oldMarks.midMarks || 0,
    lab: oldMarks.lab || 0,
    assignmentQuiz: oldMarks.assignmentQuiz || 0,
    attendance: oldMarks.attendance || 0,
    total: oldMarks.total || 0
  });
  
  // New logic (fixed)
  const newMarks = {
    midMarks: subject.midMarks || subject.marks?.midMarks || 0,
    lab: subject.lab || subject.marks?.lab || 0,
    assignmentQuiz: subject.assignmentQuiz || subject.marks?.assignmentQuiz || 0,
    attendance: subject.attendance || subject.marks?.attendance || 0,
    total: subject.total || subject.marks?.total || 0
  };
  console.log('New logic result:', newMarks);
  
  const isFixed = newMarks.total > 0;
  console.log('Status:', isFixed ? '✅ FIXED' : '❌ STILL BROKEN');
});

console.log('\n🎉 PDF marks data handling test completed!');
console.log('The fix ensures that direct properties are used first, then falls back to nested marks object.');