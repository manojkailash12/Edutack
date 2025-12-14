import { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { AiFillBook } from "react-icons/ai";
import { FaDownload } from "react-icons/fa";
import axios from "../../config/api/axios";


const Paper = () => {
  const { setPaper, paperList, setPaperList, user } = useContext(UserContext);
  const [expanded, setExpanded] = useState({}); // Track expanded state per paperId
  const [notes, setNotes] = useState({}); // Store notes per paperId
  const [loading, setLoading] = useState({}); // Track loading state per paperId
  const [sectionPapers, setSectionPapers] = useState([]); // For student section papers
  const [profileWarning, setProfileWarning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const getSectionPapers = async () => {
      try {
        if (!user.department || !user.year || !user.section) {
          setProfileWarning("Your profile is missing department, year, or section. Please contact admin.");
          setSectionPapers([]);
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
        setSectionPapers(response.data);
      } catch (err) {
        setError("Failed to fetch your section papers");
      }
    };

    const getStaffPapers = async () => {
      try {
        console.log('Fetching papers for staff:', user._id);
        const response = await axios.get(`/paper/staff/${user._id}`);
        console.log('Staff papers response:', response.data);
        // Update the paperList in context
        setPaperList(response.data);
      } catch (err) {
        console.error('Failed to fetch staff papers:', err);
        setError("Failed to fetch your papers");
        setPaperList([]);
      }
    };

    if (user.role === "student") {
      getSectionPapers();
    } else if (user.role === "staff" || user.userType === "staff") {
      getStaffPapers();
    }
  }, [user, setPaperList]);

  const handleExpand = async (paper) => {
    setExpanded((prev) => ({ ...prev, [paper._id]: !prev[paper._id] }));
    if (!expanded[paper._id] && !notes[paper._id]) {
      setLoading((prev) => ({ ...prev, [paper._id]: true }));
      try {
        let url = `/notes/paper/${paper._id}`;
        // For students, filter by their section
        if (user.role === 'student' && user.section) {
          url += `/${user.section}`;
        }
        const response = await axios.get(url);
        setNotes((prev) => ({ ...prev, [paper._id]: response.data }));
      } catch (err) {
        setNotes((prev) => ({ ...prev, [paper._id]: [] }));
      } finally {
        setLoading((prev) => ({ ...prev, [paper._id]: false }));
      }
    }
  };

  const getFileNameAndType = (attachment) => {
    if (!attachment) return { fileName: '', fileType: '' };
    // attachment: '/uploads/notes/1681234567890-somefile.pdf'
    const parts = attachment.split('/');
    const fileName = parts[parts.length - 1];
    const ext = fileName.split('.').pop();
    return { fileName, fileType: ext };
  };

  const downloadAttachment = async (note) => {
    try {
      console.log('Downloading attachment for note:', note._id);
      const response = await axios.get(`/notes/download/${note._id}`, {
        responseType: 'blob'
      });
      
      console.log('Download response headers:', response.headers);
      
      // Get filename from response headers or use original filename
      const contentDisposition = response.headers['content-disposition'];
      let filename = `note-${note._id}.txt`; // Default with .txt extension
      
      console.log('Content-Disposition header:', contentDisposition);
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
          console.log('Extracted filename from header:', filename);
        }
      } else {
        // Fallback to extracting from attachment path
        const { fileName } = getFileNameAndType(note.attachment);
        if (fileName) {
          // Remove timestamp prefix if present
          let cleanFileName = fileName;
          if (fileName.includes('-')) {
            const parts = fileName.split('-');
            if (parts.length > 1) {
              cleanFileName = parts.slice(1).join('-');
            }
          }
          filename = cleanFileName;
        }
        
        // Set extension based on content type if still no proper filename
        const contentType = response.headers['content-type'];
        if (contentType && filename === `note-${note._id}.txt`) {
          if (contentType.includes('pdf')) filename = `note-${note._id}.pdf`;
          else if (contentType.includes('image/jpeg')) filename = `note-${note._id}.jpg`;
          else if (contentType.includes('image/png')) filename = `note-${note._id}.png`;
          else if (contentType.includes('msword')) filename = `note-${note._id}.doc`;
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
      
      console.log('File downloaded successfully:', filename);
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.status === 404) {
        alert('File not found on server');
      } else {
        alert('Error downloading file: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Choose which papers to show
  const papersToShow = user.role === "student" ? sectionPapers : paperList;
  
  // Debug logging
  console.log('Paper component debug:', {
    userRole: user.role,
    userType: user.userType,
    userId: user._id,
    paperListLength: paperList?.length || 0,
    sectionPapersLength: sectionPapers?.length || 0,
    papersToShowLength: papersToShow?.length || 0
  });

  // Debug function to check database state
  const debugDatabase = async () => {
    try {
      const response = await axios.get('/paper/debug/all');
      console.log('=== DATABASE DEBUG ===');
      console.log('Database state:', response.data);
      alert('Check console for database debug info');
    } catch (err) {
      console.error('Debug error:', err);
    }
  };

  return (
    <main className="paper">
      <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Papers
      </h2>
      
      {/* Temporary debug button */}
      <button 
        onClick={debugDatabase}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        🐛 Debug Database (Check Console)
      </button>
      {profileWarning && (
        <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
          {profileWarning}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
          {error}
        </div>
      )}
      {papersToShow.length ? (
        <section className="pt-4 lg:columns-2">
          {papersToShow.map((paper, index) => (
            <div key={paper._id || index} className="mb-6">
              <div className="flex items-center justify-between">
                <Link to={paper.paper} onClick={() => setPaper(paper)} className="flex-1">
                  <article className="mb-2 flex items-center whitespace-break-spaces rounded-md  bg-violet-300 p-2 hover:bg-violet-400 duration-200 dark:bg-slate-950/80 dark:hover:bg-slate-950/50 dark:hover:text-slate-300 lg:p-4 ">
                <AiFillBook className="text-[3rem] lg:text-[4rem]" />
                <div className="">
                  <h3 className="px-1 text-xl line-clamp-1 font-semibold lg:px-2 lg:text-2xl">
                    {paper.paper}
                  </h3>
                  <hr className="border border-violet-500 dark:border-slate-400" />
                      <p className="px-2 text-sm font-medium lg:text-base ">{paper.year}</p>
                </div>
              </article>
            </Link>
                <button
                  className="ml-4 px-3 py-1 bg-violet-700 text-white rounded hover:bg-violet-900"
                  onClick={() => handleExpand(paper)}
                  type="button"
                >
                  {expanded[paper._id] ? "Hide Notes" : "Show Notes"}
                </button>
              </div>
              {expanded[paper._id] && (
                <div className="bg-violet-50 dark:bg-slate-900/40 px-6 py-4 rounded-md mt-2">
                  {loading[paper._id] ? (
                    <div>Loading notes...</div>
                  ) : notes[paper._id]?.length ? (
                    <ul className="list-disc ml-6">
                      {notes[paper._id].map((note) => {
                        const { fileType } = getFileNameAndType(note.attachment);
                        return (
                          <li key={note._id} className="mb-1 flex items-center justify-between">
                            <span className="font-medium">
                              {note.title}
                              {fileType && (
                                <span className="ml-2 text-xs text-gray-500">[{fileType.toUpperCase()}]</span>
                              )}
                            </span>
                            {note.attachment && (
                              <button
                                onClick={() => downloadAttachment(note)}
                                className="ml-2 duration-200 rounded-md p-1 text-2xl text-blue-600 hover:bg-blue-600 hover:text-slate-100 dark:text-blue-400 lg:p-2 lg:text-3xl"
                                title="Download Attachment"
                              >
                                <FaDownload />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No notes found.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      ) : (
        <p className="text-lg">No Papers Found.</p>
      )}
    </main>
  );
};

export default Paper;

