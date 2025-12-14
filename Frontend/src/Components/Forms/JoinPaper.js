import { useContext, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "../../config/api/axios";
import UserContext from "../../Hooks/UserContext";
import { TableHeader } from "../Table";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";

const JoinPaper = () => {
  const { user } = useContext(UserContext);
  const [error, setError] = useState("");
  const [papers, setPapers] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [notes, setNotes] = useState({});
  const [assignments, setAssignments] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [profileWarning, setProfileWarning] = useState("");

  useEffect(() => {
    const getSectionPapers = async () => {
      try {
        if (!user.department || !user.year || !user.section) {
          setProfileWarning("Your profile is missing department, year, or section. Please contact admin.");
          setPapers([]);
          return;
        }
        setProfileWarning("");
        // Map year label to academic year if needed
        let year = user.year;
        const yearMap = {
          "First Year": "2022-2023",
          "Second Year": "2023-2024",
          "Third Year": "2024-2025",
          "Fourth Year": "2025-2026"
        };
        if (yearMap[year]) year = yearMap[year];
        const response = await axios.get(
          `/paper/section/${encodeURIComponent(user.department)}/${encodeURIComponent(year)}/${encodeURIComponent(user.section)}`
        );
        setPapers(response.data);
      } catch (err) {
        setError(err);
      }
    };
    if (user.role === "student") {
      getSectionPapers();
    }
  }, [user]);

  const handleExpand = async (paperId) => {
    setExpanded((prev) => ({ ...prev, [paperId]: !prev[paperId] }));
    if (!expanded[paperId]) {
      setLoadingDetails((prev) => ({ ...prev, [paperId]: true }));
      try {
        const [notesRes, assignmentsRes] = await Promise.all([
          axios.get(`/notes/paper/${paperId}`),
          axios.get(`/assignments/${paperId}`)
        ]);
        setNotes((prev) => ({ ...prev, [paperId]: notesRes.data }));
        setAssignments((prev) => ({ ...prev, [paperId]: assignmentsRes.data }));
      } catch (err) {
        setNotes((prev) => ({ ...prev, [paperId]: [] }));
        setAssignments((prev) => ({ ...prev, [paperId]: [] }));
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [paperId]: false }));
      }
    }
  };

  return (
    <>
      {user.role === "student" ? (
        <main>
          <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
            My Papers
          </h2>
          {profileWarning && (
            <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
              {profileWarning}
            </div>
          )}
          <form>
            {papers.length ? (
              <>
                <div className="my-4 w-full overflow-auto rounded-md border-2 border-slate-900 dark:border-slate-500 dark:p-[1px]">
                  <table className="w-full text-left">
                    <TableHeader
                      AdditionalRowClasses={"rounded-t-xl text-left"}
                      AdditionalHeaderClasses={'last:text-center'}
                      Headers={[
                        "Paper",
                        "Department",
                        "Year",
                        "Semester",
                        "Teacher",
                        "Details"
                      ]}
                    />
                    <tbody>
                      {papers?.map((paper, index) => (
                        <>
                          <tr key={paper._id}>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2">
                              {paper.paper}
                            </td>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2">
                              {paper.department}
                            </td>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2">
                              {paper.year}
                            </td>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2">
                              {paper.semester}
                            </td>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2">
                              {paper.teacher?.name || "-"}
                            </td>
                            <td className="border-t-[1px] border-violet-400 dark:border-slate-400 px-4 py-2 text-center">
                              <button
                                type="button"
                                className="px-3 py-1 bg-violet-700 text-white rounded hover:bg-violet-900"
                                onClick={() => handleExpand(paper._id)}
                              >
                                {expanded[paper._id] ? "Hide" : "Show"}
                              </button>
                            </td>
                          </tr>
                          {expanded[paper._id] && (
                            <tr key={paper._id + "-details"}>
                              <td colSpan={6} className="bg-violet-50 dark:bg-slate-900/40 px-6 py-4">
                                {loadingDetails[paper._id] ? (
                                  <div>Loading details...</div>
                                ) : (
                                  <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-lg mb-2">Notes</h4>
                                      {notes[paper._id]?.length ? (
                                        <ul className="list-disc ml-6">
                                          {notes[paper._id].map((note) => (
                                            <li key={note._id} className="mb-1">
                                              <span className="font-medium">{note.title}</span>
                                              {note.attachment && (
                                                <a
                                                  href={note.attachment}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="ml-2 text-blue-600 underline"
                                                >
                                                  Download
                                                </a>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="text-gray-500">No notes found.</div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-lg mb-2">Assignments</h4>
                                      {assignments[paper._id]?.length ? (
                                        <ul className="list-disc ml-6">
                                          {assignments[paper._id].map((assignment) => (
                                            <li key={assignment._id} className="mb-1">
                                              <span className="font-medium">{assignment.question}</span>
                                              {assignment.attachment && (
                                                <a
                                                  href={assignment.attachment}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="ml-2 text-blue-600 underline"
                                                >
                                                  Download
                                                </a>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="text-gray-500">No assignments found.</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Loading />
            )}
          </form>
          {error ? <ErrorStrip error={error} /> : ""}
        </main>
      ) : (
        <Navigate to="/dash" />
      )}
    </>
  );
};

export default JoinPaper;
