// Backend/middleware/fakeHOD.js
module.exports = (req, res, next) => {
  // Simulate a logged-in HOD user
  req.user = {
    _id: "687b575ff9323503216567e2", // Real HOD ObjectId from the database
    name: "HOD",
    role: "HOD",
    department: req.params.department || "Computer Science and Engineering (CSE)"
  };
  next();
}; 