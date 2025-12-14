import { useContext, useEffect, useState, useCallback } from "react";
import axios from "../../config/api/axios";
import { useNavigate, useParams } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { toast } from "react-toastify";
import { FaPlus, FaUpload } from "react-icons/fa";
import { RxUpdate } from "react-icons/rx";
import ErrorStrip from "../ErrorStrip";

const NotesForm = () => {
  const { user, paper, notes } = useContext(UserContext);
  const [note, setNote] = useState({
    paper: paper._id,
    title: "",
    body: "",
    section: "",
  });
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [teacherPapers, setTeacherPapers] = useState([]);
  const [selectedPaperSections, setSelectedPaperSections] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState("");
  const navigate = useNavigate();
  const noteId = useParams()?.note;
  
  // Fetch teacher's papers and sections
  useEffect(() => {
    const fetchTeacherPapers = async () => {
      try {
        const response = await axios.get(`/notes/teacher-papers/${user._id}`);
        setTeacherPapers(response.data);
      } catch (err) {
        console.error('Error fetching teacher papers:', err);
      }
    };
    if (user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD')) {
      fetchTeacherPapers();
    }
  }, [user]);

  // When paper changes, update available sections
  useEffect(() => {
    if (note.paper && teacherPapers.length > 0) {
      const selectedPaper = teacherPapers.find(p => p._id === note.paper);
      if (selectedPaper) {
        setSelectedPaperSections(selectedPaper.sections);
        setSelectedSections([]);
        setNote(prev => ({ ...prev, section: '' })); // keep for backward compat
      }
    }
  }, [note.paper, teacherPapers]);

  // Function to fetch a specific note by ID
  const fetchNoteById = useCallback(async (id) => {
    try {
      console.log('Fetching note by ID:', id);
      const response = await axios.get(`/notes/${id}`);
      const fetchedNote = response.data;
      console.log('Fetched note:', fetchedNote);
      
      const noteToEdit = {
        ...fetchedNote,
        paper: fetchedNote.paper?._id || fetchedNote.paper || paper._id,
      };
      setNote(noteToEdit);
      
      if (fetchedNote.section) {
        setSelectedSections([fetchedNote.section]);
      }
    } catch (err) {
      console.error('Error fetching note:', err);
      toast.error('Failed to load note for editing');
    }
  }, [paper._id]);
  
  useEffect(() => {
    if (noteId && notes) {
      console.log('=== NOTES FORM EDIT DEBUG ===');
      console.log('Note ID from URL:', noteId);
      console.log('Available notes:', notes.map(n => ({ id: n._id, title: n.title })));
      
      // Find the note by its _id, not by array index
      const foundNote = notes.find(n => n._id === noteId);
      console.log('Found note for editing:', foundNote);
      
      if (foundNote) {
        const noteToEdit = {
          ...foundNote,
          paper: foundNote.paper?._id || foundNote.paper || paper._id, // Handle populated paper object
        };
        console.log('Setting note data:', noteToEdit);
        setNote(noteToEdit);
        
        if (foundNote.section) {
          setSelectedSections([foundNote.section]);
          console.log('Set selected sections:', [foundNote.section]);
        }
      } else {
        console.log('Note not found in notes array');
        // If note not found in current notes, fetch it directly
        fetchNoteById(noteId);
      }
    }
  }, [noteId, notes, paper._id, fetchNoteById]);

  const handleFormChange = (e) => {
    setNote({
      ...note,
      [e.target.id]: e.target.value,
    });
  };

  const toggleSection = (section) => {
    setSelectedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'ppt', 'pptx'];
      if (allowedTypes.includes(ext)) {
        setSelectedFile(file);
      } else {
        toast.error('File type not allowed. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, PPT, PPTX');
      }
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    try {
      const sectionsToUse = selectedSections.length ? selectedSections : [note.section].filter(Boolean);
      if (!sectionsToUse.length) {
        toast.error('Please select at least one section');
        return;
      }
      await Promise.all(sectionsToUse.map(sec => axios.post(`notes/paper/${note.paper}`, { ...note, section: sec })));
      setError("");
      navigate(-1, { replace: true });
      toast.success('Notes added');
    } catch (err) {
      setError(err);
    }
  };

  const uploadNoteWithFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const sectionsToUse = selectedSections.length ? selectedSections : [note.section].filter(Boolean);
    if (!sectionsToUse.length) {
      toast.error('Please select at least one section');
      return;
    }

    setIsUploading(true);
    try {
      await Promise.all(sectionsToUse.map(async (sec) => {
        const formData = new FormData();
        formData.append('attachment', selectedFile);
        formData.append('title', note.title);
        formData.append('body', note.body);
        formData.append('section', sec);
        await axios.post(`notes/paper/${note.paper}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }));
      setError("");
      navigate(-1, { replace: true });
      toast.success('Notes uploaded for selected sections');
    } catch (err) {
      setError(err);
    } finally {
      setIsUploading(false);
    }
  };

  const updateNote = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!note.title || !note.body || !note.paper) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Ensure we have a valid note ID
    if (!note._id && !noteId) {
      toast.error('Note ID is missing');
      return;
    }
    
    try {
      // Use noteId from URL params or note._id
      const idToUse = noteId || note._id;
      
      // Send only the necessary fields, not the _id (it's in the URL)
      const { _id, createdAt, updatedAt, __v, ...noteData } = note;
      
      // Use selected sections if available, otherwise use note.section
      if (selectedSections.length > 0) {
        noteData.section = selectedSections[0]; // For now, use first selected section
      }
      
      // Ensure paper is just the ID, not the populated object
      if (typeof noteData.paper === 'object' && noteData.paper._id) {
        noteData.paper = noteData.paper._id;
      }
      
      console.log('Updating note:', { noteId: idToUse, noteData });
      
      const response = await axios.patch(`/notes/${idToUse}`, noteData);
      navigate(-1, { replace: true });
      setError("");
      toast.success(response.data.message);
    } catch (err) {
      console.error('Update note error:', err);
      if (err.response?.data?.message) {
        toast.error('Update failed: ' + err.response.data.message);
      } else {
        toast.error('Update failed: ' + (err.message || 'Unknown error'));
      }
      setError(err);
    }
  };

  return (
    <main className="notes">
      <h2 className="mb-2 mt-3 text-6xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400">
        {paper?.paper}
      </h2>
      <h3 className="text-2xl font-medium">
        {noteId !== undefined ? "Edit Note" : "Add New Note"}
      </h3>
      
      {/* Debug info for edit mode */}
      {noteId !== undefined && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Editing Note ID:</strong> {noteId}
          </p>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Note._id:</strong> {note._id || 'Not set'}
          </p>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Current Title:</strong> {note.title || 'Loading...'}
          </p>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Paper ID:</strong> {typeof note.paper === 'object' ? note.paper?._id : note.paper}
          </p>
          {note.section && (
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Section:</strong> {note.section}
            </p>
          )}
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Available Notes Count:</strong> {notes?.length || 0}
          </p>
        </div>
      )}
      <form>
        {user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD') && (
          <div className="mb-4">
            <label htmlFor="paper" className="block text-lg font-medium">
              Select Paper:
            </label>
            <select
              className="block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              id="paper"
              value={note.paper}
              onChange={handleFormChange}
              required
            >
              <option value="">Select Paper</option>
              {teacherPapers.map((paper, index) => (
                <option key={index} value={paper._id}>
                  {paper.paper} - {paper.sections.join(', ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {user.userType === 'staff' && (user.role === 'teacher' || user.role === 'HOD') && note.paper && (
          <div className="mb-4">
            <label className="block text-lg font-medium">
              Select Section(s):
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-md border border-slate-400 p-3 dark:border-slate-600">
              {selectedPaperSections.map((section, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section)}
                    onChange={() => toggleSection(section)}
                    className="h-4 w-4 rounded border-slate-400 text-violet-900 focus:ring-violet-900 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-violet-400"
                  />
                  <span className="text-sm font-medium">{section}</span>
                </label>
              ))}
            </div>
            {selectedSections.length > 0 && (
              <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">
                Selected: {selectedSections.join(', ')}
              </p>
            )}
          </div>
        )}

        <label htmlFor="title" className="block text-lg font-medium">
          Title:
        </label>
        <input
          className="mb-4 block h-10 w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
          type="text"
          id="title"
          required
          value={note?.title}
          onChange={(e) => handleFormChange(e)}
        />
        <label htmlFor="body" className="block text-lg font-medium">
          Body:
        </label>
        <textarea
          className="mb-4 block w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
          rows="12"
          type="text"
          id="body"
          required
          value={note?.body}
          onChange={(e) => handleFormChange(e)}
        />

        {noteId === undefined && (
          <div className="mb-4">
            <label htmlFor="file" className="block text-lg font-medium">
              Upload PDF/DOC (Optional):
            </label>
            <input
              className="block w-full rounded-md border-[1.5px] border-solid border-slate-400 p-1 pl-2 outline-none selection:border-slate-200 focus:border-violet-900 dark:border-slate-200 dark:caret-inherit dark:focus:border-violet-400 dark:active:border-violet-400"
              type="file"
              id="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
        )}

        {noteId !== undefined ? (
          <button
            className="mb-4 flex h-10 w-auto items-center gap-2 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 px-4 py-2 font-semibold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900 "
            type="submit"
            onClick={(e) => updateNote(e)}
          >
            <RxUpdate />
            Update Note
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              className="mb-4 flex h-10 w-auto items-center gap-2 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 px-4 py-2 font-semibold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900"
              type="submit"
              onClick={(e) => addNote(e)}
            >
              <FaPlus />
              Add Note
            </button>
            {selectedFile && (
              <button
                className="mb-4 flex h-10 w-auto items-center gap-2 rounded-md border-[1.5px] border-solid border-violet-900 bg-slate-800 px-4 py-2 font-semibold tracking-wide text-slate-200 hover:bg-violet-900 focus:bg-violet-900 dark:border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:hover:bg-slate-900"
                type="submit"
                onClick={(e) => uploadNoteWithFile(e)}
                disabled={isUploading}
              >
                <FaUpload />
                {isUploading ? 'Uploading...' : 'Upload with File'}
              </button>
            )}
          </div>
        )}
      </form>
      {error ? <ErrorStrip error={error} /> : ""}
    </main>
  );
};

export default NotesForm;
