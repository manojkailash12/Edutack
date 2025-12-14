import { useState, useEffect, useContext } from "react";
import axios from "../../config/api/axios";
import { Link } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { FaTrash, FaEdit, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";

const Notes = () => {
  const { paper, notes, setNotes, user } = useContext(UserContext);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [selectedPaperSections, setSelectedPaperSections] = useState([]);

  // Fetch teacher's papers and sections
  useEffect(() => {
    const fetchTeacherPapers = async () => {
      try {
        const response = await axios.get(`/notes/teacher-papers/${user._id}`);
        // Find current paper and set its sections
        const currentPaper = response.data.find(p => p._id === paper._id);
        if (currentPaper) {
          setSelectedPaperSections(currentPaper.sections);
        }
      } catch (err) {
        console.error('Error fetching teacher papers:', err);
      }
    };
    if (user.userType === 'staff' && user.role === 'teacher' && paper?._id) {
      fetchTeacherPapers();
    }
  }, [user, paper?._id]);

  useEffect(() => {
    const getNotes = async () => {
      // Don't fetch if paper is not loaded yet
      if (!paper?._id) {
        return;
      }
      
      try {
        let url = "/notes/paper/" + paper._id;
        
        // For students, filter by their section
        if (user.userType === 'student' && user.section) {
          url += "/" + user.section;
          console.log('Student fetching notes from:', url, 'for section:', user.section);
        }
        // For teachers, filter by section if selected
        else if (user.userType === 'staff' && user.role === 'teacher' && selectedSection) {
          url += "/" + selectedSection;
        }
        
        const response = await axios.get(url);
        console.log('Notes response:', response.data);
        setNotes(response.data);
        setError("");
      } catch (err) {
        // Treat 404 (no notes found) as empty list rather than an error
        if (err?.response?.status === 404) {
          setNotes([]);
          setError("");
        } else {
          setError(err);
        }
      }
    };
    getNotes();
    // return () => setNotes([]);
  }, [paper, setNotes, selectedSection, user]);

  const deleteNote = async (e) => {
    const id = e.currentTarget.id;
    const response = await axios.delete("notes/" + id);
    const newNotes = notes.filter((note) => note._id !== id);
    setNotes(newNotes);
    toast.success(response.data.message, {
      icon: () => <FaTrash />,
    });
  };

  const downloadAttachment = async (noteId) => {
    try {
      console.log('Downloading attachment for note:', noteId);
      const response = await axios.get(`/notes/download/${noteId}`, {
        responseType: 'blob'
      });
      
      console.log('Download response headers:', response.headers);
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `note-${noteId}.txt`; // Default with .txt extension
      
      console.log('Content-Disposition header:', contentDisposition);
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
          console.log('Extracted filename from header:', filename);
        }
      }
      
      // Also try to get filename from content-disposition without quotes
      if (!contentDisposition || !contentDisposition.includes('filename=')) {
        // Fallback: try to get from other headers or use a better default
        const contentType = response.headers['content-type'];
        console.log('Content-Type:', contentType);
        
        // Set extension based on content type if no filename found
        if (contentType) {
          if (contentType.includes('pdf')) filename = `note-${noteId}.pdf`;
          else if (contentType.includes('image/jpeg')) filename = `note-${noteId}.jpg`;
          else if (contentType.includes('image/png')) filename = `note-${noteId}.png`;
          else if (contentType.includes('msword')) filename = `note-${noteId}.doc`;
        }
      }
      
      console.log('Final filename for download:', filename);
      
      // Create a download link with proper blob type
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`File downloaded: ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.status === 404) {
        toast.error('File not found on server');
      } else {
        toast.error('Error downloading file: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Don't render if paper is not loaded yet
  if (!paper || !paper._id) {
    return <Loading />;
  }

  return (
    <main>
      <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        {paper.paper}
      </h2>
      
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
              Showing notes for Section: {selectedSection}
            </p>
          )}
        </div>
      )}

      <ul className="grid grid-cols-1 font-semibold sm:grid-cols-2 lg:flex lg:items-center lg:justify-start lg:gap-16">
        <li className="p-1">Batch : {paper?.year || 'N/A'}</li>
        <li className="p-1">Semester : {paper?.semester || 'N/A'}</li>
        {user.userType === "student" && (
          <>
            <li className="p-1">Teacher : {paper.teacher?.name || 'Not Assigned'}</li>
            <li className="p-1 bg-violet-200 dark:bg-violet-800 rounded px-2">
              Section : {user.section}
            </li>
          </>
        )}
        <li>
          <Link
            className="rounded-md px-2 py-1 underline decoration-violet-900  decoration-2 underline-offset-2 hover:bg-violet-950 hover:text-slate-100 hover:decoration-0 dark:decoration-inherit dark:hover:bg-violet-900/80 dark:hover:text-slate-200 md:p-2 "
            to="students"
          >
            Students
          </Link>
        </li>
        {user.userType === "staff" && (
          <li>
            <Link
              className="rounded-md px-2 py-1 underline decoration-violet-900   decoration-2 underline-offset-2 hover:bg-violet-950 hover:text-slate-100 hover:decoration-0 dark:decoration-inherit dark:hover:bg-violet-900/80 dark:hover:text-slate-200 md:p-2 "
              to="add"
            >
              Add Note
            </Link>
          </li>
        )}
      </ul>

      <hr className="mt-3 border-b-[1px] border-slate-500 " />

      <section className="note__body w-full ">
        {/* Debug info for students */}
        {user.userType === "student" && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-200">
            <p>Loading notes for Section: {user.section}</p>
            <p>Found {notes?.length || 0} notes</p>
            {notes?.length > 0 && (
              <p>Notes with attachments: {notes.filter(n => n.attachment).length}</p>
            )}
          </div>
        )}
        
        {notes?.map((note, index) => (
          <article
            className="mt-4 overflow-auto whitespace-break-spaces rounded-md  bg-violet-300 hover:bg-violet-400/60 dark:bg-slate-800/70 dark:hover:bg-slate-800 duration-300 dark:text-slate-300"
            key={index}
          >
            <details className="duration-200">
              <summary className="list-none duration-200">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <h3 className="p-4 text-lg font-semibold">{note.title}</h3>
                    {note.section && (
                      <span className="rounded bg-violet-600 px-2 py-1 text-sm text-white">
                        {note.section}
                      </span>
                    )}
                    {!note.section && (
                      <span className="rounded bg-green-600 px-2 py-1 text-sm text-white">
                        All Sections
                      </span>
                    )}
                    {note.attachment && (
                      <span className="ml-2 rounded bg-blue-600 px-2 py-1 text-sm text-white flex items-center">
                        📎 File Attached
                      </span>
                    )}
                  </div>
                  <div className="flex p-3 pb-1">
                    {note.attachment && (
                      <button
                        onClick={() => downloadAttachment(note._id)}
                        className="ml-2 duration-200 rounded-md p-2 text-2xl text-white bg-blue-600 hover:bg-blue-700 lg:p-3 lg:text-3xl"
                        title="Download Attachment"
                      >
                        <FaDownload />
                      </button>
                    )}
                    {user.userType === "staff" && (
                      <>
                        <Link to={`${note._id}/edit`} id={note._id}>
                          <FaEdit className="ml-2 duration-200 rounded-md p-1 text-3xl hover:bg-violet-900 hover:text-slate-100 dark:hover:bg-violet-600 lg:p-2 lg:text-4xl" />
                        </Link>
                        <Link
                          id={note._id}
                          style={{ color: "rgba(220, 20, 60, 0.8)" }}
                          onClick={(e) => deleteNote(e)}
                        >
                          <FaTrash className="ml-2 duration-200 rounded-md p-1 text-3xl text-red-700 hover:bg-red-700 hover:text-slate-100 dark:text-red-700/70 lg:p-2 lg:text-4xl" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </summary>
              <hr className="border-b-[1.5px] border-violet-900 dark:border-slate-500 " />
              <pre className="whitespace-pre-wrap p-4 font-sans">
                {note.body}
              </pre>
              {!note.attachment && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    📝 Text-only note (no file attachment)
                  </p>
                </div>
              )}
            </details>
          </article>
        ))}
        {!notes.length && !error && (
          <div className="mt-8 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No Notes Available
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {user.userType === "student" 
                  ? `No notes have been uploaded for Section ${user.section} yet.`
                  : "No notes have been uploaded for this paper yet."
                }
              </p>
            </div>
          </div>
        )}
      </section>
      {error ? <ErrorStrip error={error} /> : ""}
    </main>
  );
};

export default Notes;
