import { useContext, useState, useEffect, useRef } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";

const SkeletonTable = () => (
  <div className="animate-pulse mt-4">
    <div className="mb-4 rounded-md bg-violet-100 p-4 dark:bg-slate-800">
      <div className="h-6 w-1/3 bg-violet-200 dark:bg-slate-700 mb-2 rounded" />
      <div className="h-4 w-1/4 bg-violet-200 dark:bg-slate-700 mb-1 rounded" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-slate-400">
        <thead>
          <tr className="bg-violet-200 dark:bg-slate-700">
            {[...Array(6)].map((_, i) => (
              <th key={i} className="border border-slate-400 px-4 py-2 text-left">
                <div className="h-4 w-16 bg-violet-200 dark:bg-slate-700 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, i) => (
            <tr key={i} className="hover:bg-violet-50 dark:hover:bg-slate-700">
              {[...Array(6)].map((_, j) => (
                <td key={j} className="border border-slate-400 px-4 py-2">
                  <div className="h-4 w-full bg-violet-100 dark:bg-slate-800 rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StudentsList = () => {
  const { paper, user } = useContext(UserContext);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [teacherPapers, setTeacherPapers] = useState([]);
  const [selectedPaperSections, setSelectedPaperSections] = useState([]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const loadingTimeout = useRef();

  // Fetch teacher's papers and sections
  useEffect(() => {
    const fetchTeacherPapers = async () => {
      try {
        const response = await axios.get(`/students/teacher-papers/${user._id}`);
        setTeacherPapers(response.data);
        // Find current paper and set its sections
        const currentPaper = response.data.find(p => p._id === paper._id);
        if (currentPaper) {
          setSelectedPaperSections(currentPaper.sections);
        }
      } catch (err) {
        console.error('Error fetching teacher papers:', err);
      }
    };
    if (user.userType === 'staff' && user.role === 'teacher') {
      fetchTeacherPapers();
    }
  }, [user, paper._id]);

  useEffect(() => {
    const getStudentsList = async () => {
      try {
        let url = "/paper/students/" + paper._id;
        // For teachers, filter by section if selected
        if (user.userType === 'staff' && user.role === 'teacher' && selectedSection) {
          url = `/students/paper/${paper._id}/${selectedSection}`;
        }
        const response = await axios.get(url);
        setStudents(response.data);
      } catch (err) {
        setError(err);
      }
    };
    getStudentsList();
  }, [paper, selectedSection, user]);

  useEffect(() => {
    if (!students.length && !error) {
      loadingTimeout.current = setTimeout(() => setShowSkeleton(true), 1000);
    } else {
      setShowSkeleton(false);
      clearTimeout(loadingTimeout.current);
    }
    return () => clearTimeout(loadingTimeout.current);
  }, [students, error]);

  return (
    <main className="student">
      <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Students List
      </h2>
      <p className="text-2xl font-bold">{paper.paper}</p>
      
      {/* Section Filter for Teachers */}
      {user.userType === 'staff' && user.role === 'teacher' && selectedPaperSections.length > 0 && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">
            Filter by Section:
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-slate-400 p-2 dark:border-slate-600">
            {selectedPaperSections.map((section, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSection === section}
                  onChange={(e) => setSelectedSection(e.target.checked ? section : '')}
                  className="h-4 w-4 rounded border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
                />
                <span className="text-sm font-medium">{section}</span>
              </label>
            ))}
          </div>
          {selectedSection && (
            <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">
              Showing students from Section: {selectedSection}
            </p>
          )}
        </div>
      )}

      {students.length ? (
        <div className="mt-4">
          <div className="mb-4 rounded-md bg-violet-100 p-4 dark:bg-slate-800">
            <h3 className="text-lg font-semibold mb-2">Total Students: {students.length}</h3>
            {selectedSection && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing students from Section: {selectedSection}
              </p>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-violet-200 dark:bg-slate-700">
                  <th className="border border-slate-400 px-4 py-2 text-left">S.No</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Name</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Roll No</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Section</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Year</th>
                  <th className="border border-slate-400 px-4 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {students?.map((student, index) => (
                  <tr key={index} className="hover:bg-violet-50 dark:hover:bg-slate-700">
                    <td className="border border-slate-400 px-4 py-2">{index + 1}</td>
                    <td className="border border-slate-400 px-4 py-2 font-medium">{student.name}</td>
                    <td className="border border-slate-400 px-4 py-2">{student.rollNo}</td>
                    <td className="border border-slate-400 px-4 py-2">
                      <span className="rounded bg-violet-600 px-2 py-1 text-sm text-white">
                        {student.section}
                      </span>
                    </td>
                    <td className="border border-slate-400 px-4 py-2">{student.year}</td>
                    <td className="border border-slate-400 px-4 py-2 text-sm">{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        ""
      )}
      {!students.length && !error && (
        <>
          <Loading />
          {showSkeleton && <SkeletonTable />}
          {showSkeleton && <div className="text-center text-sm text-gray-500 mt-4">Still loading, please wait…</div>}
        </>
      )}

      <div>{error ? <ErrorStrip error={error} /> : ""}</div>
    </main>
  );
};

export default StudentsList;
