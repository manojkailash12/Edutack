import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import { useNavigate, Navigate } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import { FaPlus } from "react-icons/fa";
import ErrorStrip from "../ErrorStrip";
import { getCreditOptions } from "../../constants/credits";

const PaperForm = () => {
  const { user } = useContext(UserContext);
  const [newPaper, setNewPaper] = useState({
    department: user.department,
    paper: "",
    subjectCode: "",
    credits: 3,
    year: "2025-2026",
    students: [],
    semester: "Select Semester",
    teacher: "",
    sections: [],
  });
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Available sections
  const availableSections = ["ALPHA", "BETA", "GAMMA", "DELTA", "SIGMA", "OMEGA", "ZETA", "EPSILON"];

  // Fetch staffs
  useEffect(() => {
    const getTeachers = async () => {
      try {
        console.log('Fetching teachers for department:', user.department);
      const list = await axios.get("/staff/list/" + user.department);
        console.log('Teachers fetched:', list.data);
      setTeachers(list.data);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        toast.error("Failed to load teachers. Please try again.");
      }
    };
    getTeachers();
  }, [user]);

  const addPaper = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting paper data:', newPaper);
      const response = await axios.post("paper", JSON.stringify(newPaper));
      navigate("./..");
      toast.success(response.data.message);
    } catch (err) {
      console.error('Error creating paper:', err);
      const errorMessage = err.response?.data?.message || err.message || "Error creating paper";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setNewPaper({
      ...newPaper,
      [id]: id === 'credits' ? parseInt(value) : (id === 'subjectCode' ? value.toUpperCase() : value),
    });
  };

  const handleSectionChange = (section) => {
    setNewPaper(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  return (
    <>
      {user.role === "HOD" ? (
        <main className="paper">
          <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
            Add Paper
          </h2>
          <form className="w-full md:w-1/3">
            <label htmlFor="department">Department:</label>
            <input
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              name="department"
              type="text"
              required
              id="department"
              value={newPaper.department}
              disabled
            />
            <label htmlFor="paper">Paper Name:</label>
            <input
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              type="text"
              name="paper"
              id="paper"
              placeholder="e.g., Computer Programming"
              value={newPaper.paper}
              required
              onChange={(e) => handleFormChange(e)}
            />
            <label htmlFor="subjectCode">Subject Code:</label>
            <input
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              type="text"
              name="subjectCode"
              id="subjectCode"
              placeholder="e.g., CSE101, EEE201"
              value={newPaper.subjectCode}
              required
              onChange={(e) => handleFormChange(e)}
              style={{ textTransform: 'uppercase' }}
            />
            <label htmlFor="credits">Credits:</label>
            <select
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              id="credits"
              value={newPaper.credits}
              required
              onChange={(e) => handleFormChange(e)}
            >
              {getCreditOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label htmlFor="semester">Semester:</label>
            <select
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              id="semester"
              value={newPaper.semester}
              required
              onChange={(e) => handleFormChange(e)}
            >
              <option defaultValue hidden>
                Select Semester
              </option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
              <option value="VI">VI</option>
              <option value="VII">VII</option>
              <option value="VIII">VIII</option>
            </select>
            <label htmlFor="year">Year:</label>
            <input
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              type="text"
              placeholder="e.g., 2024-2025"
              required
              id="year"
              value={newPaper.year}
              onChange={(e) => handleFormChange(e)}
            />
            <label htmlFor="teacher">Teacher:</label>
            <select
              className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              required
              id="teacher"
              name="teacher"
              value={newPaper.teacher}
              onChange={(e) => handleFormChange(e)}
            >
              <option defaultValue hidden>
                Select Teacher
              </option>
              {teachers?.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            
            <label className="block mb-2">Sections:</label>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-slate-400 p-3 dark:border-slate-600">
              {availableSections.map((section) => (
                <label key={section} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPaper.sections.includes(section)}
                    onChange={() => handleSectionChange(section)}
                    className="h-4 w-4 rounded border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
                  />
                  <span className="text-sm font-medium">{section}</span>
                </label>
              ))}
            </div>
            
            {newPaper.sections.length > 0 && (
              <div className="mb-4 rounded-md bg-violet-100 p-2 dark:bg-slate-800">
                <p className="text-sm text-violet-900 dark:text-violet-400">
                  Selected Sections: {newPaper.sections.join(", ")}
                </p>
              </div>
            )}

            <button
              className="mb-4 flex h-10 w-auto items-center gap-2 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 px-6 py-2 font-semibold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900"
              type="submit"
              onClick={(e) => addPaper(e)}
            >
              <FaPlus />
              Add
            </button>
          </form>
          {error ? <ErrorStrip error={error} /> : ""}
        </main>
      ) : (
        <Navigate to="/" replace={true} />
      )}
    </>
  );
};

export default PaperForm;
