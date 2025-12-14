import React from "react";
import UserContext from "../../Hooks/UserContext";
import { TableHeader } from "../Table";
import axios from "../../config/api/axios";
import Loading from "../Layouts/Loading";
import ErrorStrip from "../ErrorStrip";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";

const InternalStudent = () => {
  const { user } = React.useContext(UserContext);
  const [internal, setInternal] = React.useState([]);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const fetchInternal = async () => {
      try {
        const response = await axios.get("/internal/student/" + user._id);
        setInternal(response.data);
      } catch (err) {
        setError(err);
      }
    };
    fetchInternal();
  }, [user]);

  // Download Student PDF Report
  const downloadStudentPDF = async () => {
    try {
      const response = await axios.get(`/internal/student/${user._id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Student_Report_${user.rollNo || user.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Student PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading student PDF:', error);
      toast.error('Error downloading PDF: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <main className="internal">
      <div className="flex justify-between items-center mb-6">
        <h2 className="mb-2 mt-3 whitespace-break-spaces text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
          Internal Mark
        </h2>
        <button
          onClick={downloadStudentPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <FaDownload />
          Download PDF Report
        </button>
      </div>
      <div>{error ? <ErrorStrip error={error} /> : ""}</div>
      {internal.length ? (
        <section className="my-4 w-full overflow-auto rounded-md border-2 border-slate-900 dark:border-slate-500 dark:p-[1px]">
          <table className="w-full ">
            <TableHeader
              AdditionalHeaderClasses={"first:text-left"}
              Headers={[
                "Paper",
                "Test",
                "Seminar",
                "Assignment",
                "Attendance",
                "Total",
              ]}
            />
            <tbody className="text-left">
              {internal?.map((paper, index) => (
                <tr
                  key={index}
                  className={
                    parseInt(paper?.marks.test) +
                      parseInt(paper?.marks.seminar) +
                      parseInt(paper?.marks.assignment) +
                      parseInt(paper?.marks.attendance) >
                    7
                      ? "border-t-[1px] border-violet-500 bg-violet-900/50 first:border-none"
                      : "border-t-[1px] border-violet-500 first:border-none"
                  }
                >
                  <td className="p-2 text-left">{paper.paper.paper}</td>
                  <td className="p-2 text-center">{paper.marks.test}</td>
                  <td className="p-2 text-center">{paper.marks.seminar}</td>
                  <td className="p-2 text-center">{paper.marks.assignment}</td>
                  <td className="p-2 text-center">{paper.marks.attendance}</td>
                  <td className="p-2 text-center">
                    {paper.marks.test +
                      paper.marks.seminar +
                      paper.marks.assignment +
                      paper.marks.attendance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <Loading />
      )}
    </main>
  );
};

export default InternalStudent;
