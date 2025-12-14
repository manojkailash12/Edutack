import { useState } from "react";
import axios from "../../config/api/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const StudentForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + Details, 3: Success
  const [student, setStudent] = useState({
    name: "",
    email: "",
    course: "",
    rollNo: "",
    year: "",
    section: "",
    password: "",
    otp: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFormChange = (e) => {
    setStudent({
      ...student,
      [e.target.id]: e.target.value,
    });
  };

  // Send OTP for email verification
  const sendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post("/auth/register/send-otp", {
        email: student.email,
        role: "student"
      });
      
      setMessage(response.data.message);
      setStep(2);
      toast.success("OTP sent to your email!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Basic frontend validation for academic year format
    const yearPattern = /^\d{4}-\d{4}$/;
    const trimmedYear = (student.year || "").trim();
    if (!yearPattern.test(trimmedYear)) {
      toast.error("Year must be in the format YYYY-YYYY (e.g., 2025-2026)");
      setLoading(false);
      return;
    }

    try {
      const userData = {
        name: student.name,
        rollNo: student.rollNo,
        password: student.password,
        department: student.course,
        section: student.section,
        year: trimmedYear
      };

      const response = await axios.post("/auth/register/verify-otp", {
        email: student.email,
        otp: student.otp,
        role: "student",
        userData
      });
      
      setMessage(response.data.message);
      setStep(3);
      toast.success("Registration successful!");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setStudent({
      name: "",
      email: "",
      course: "",
      rollNo: "",
      year: "",
      section: "",
      password: "",
      otp: "",
    });
    setMessage("");
    setError("");
  };

  return (
    <div className="scrollWidth w-full animate-fadeIn font-medium tracking-wide accent-violet-600">
      {/* Step Indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-12 h-1 ${step >= 2 ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-12 h-1 ${step >= 3 ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            ✓
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 1 && (
        <form onSubmit={sendOTP}>
          <label className="block" htmlFor="email">
            Email:
          </label>
          <input
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="email"
            required
            id="email"
            value={student.email}
            onChange={(e) => handleFormChange(e)}
          />
          <button
            type="submit"
            disabled={loading}
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 p-1 font-bold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-600 dark:text-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {/* Step 2: OTP + Details */}
      {step === 2 && (
        <form onSubmit={addStudent}>
          <label className="block" htmlFor="otp">
            Enter OTP sent to {student.email}:
          </label>
          <input
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="text"
            required
            id="otp"
            placeholder="Enter 6-digit OTP"
            maxLength="6"
            value={student.otp}
            onChange={(e) => handleFormChange(e)}
          />

          <label className="block" htmlFor="name">
            Name:
          </label>
          <input
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="text"
            required
            id="name"
            value={student.name}
            onChange={(e) => handleFormChange(e)}
          />

          <label className="block" htmlFor="course">
            Course:
          </label>
          <select
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="course"
            required
            value={student.course}
            onChange={handleFormChange}
          >
            <option value="" disabled>Select Course</option>
            <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
            <option value="AIML">AIML</option>
            <option value="Cyber Security">Cyber Security</option>
            <option value="Data Science">Data Science</option>
            <option value="IOT">IOT</option>
            <option value="Information Technology">Information Technology</option>
          </select>

          <label className="block" htmlFor="rollNo">
            Roll No:
          </label>
          <input
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="text"
            required
            id="rollNo"
            value={student.rollNo}
            onChange={handleFormChange}
          />

          <label className="block" htmlFor="year">
            Academic Year (YYYY-YYYY):
          </label>
          <input
            className="mb-1 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="text"
            id="year"
            required
            placeholder="2025-2026"
            value={student.year}
            onChange={handleFormChange}
          />
          <p className="mb-4 text-xs text-red-600">Year must be in the format YYYY-YYYY (e.g., 2025-2026)</p>

          <label className="block" htmlFor="section">
            Section:
          </label>
          <select
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            id="section"
            required
            value={student.section}
            onChange={handleFormChange}
          >
            <option value="" disabled>Select Section</option>
            <option value="ALPHA">ALPHA</option>
            <option value="BETA">BETA</option>
            <option value="GAMMA">GAMMA</option>
            <option value="DELTA">DELTA</option>
            <option value="SIGMA">SIGMA</option>
            <option value="OMEGA">OMEGA</option>
            <option value="ZETA">ZETA</option>
            <option value="EPSILON">EPSILON</option>
          </select>

          <label className="block" htmlFor="password">
            Password:
          </label>
          <input
            className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
            type="password"
            id="password"
            value={student.password}
            onChange={(e) => handleFormChange(e)}
            required
          />

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 h-10 rounded-md border-[1.5px] border-solid border-gray-500 bg-gray-500 font-bold tracking-wide text-white hover:bg-gray-600 focus:bg-gray-600"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 font-bold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-600 dark:text-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Registration Successful!</h3>
            <p className="text-gray-600 mb-6">
              You can now login with your credentials.
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={resetForm}
              className="flex-1 h-10 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 font-bold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900"
            >
              Register Another Student
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 h-10 rounded-md border-[1.5px] border-solid border-green-600 bg-green-600 font-bold tracking-wide text-white hover:bg-green-700 focus:bg-green-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForm;
