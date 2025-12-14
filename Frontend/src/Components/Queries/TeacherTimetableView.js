import { useEffect, useState, useContext } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import Loading from "../Layouts/Loading";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = ["1", "2", "3", "4"];

const TeacherTimetableView = () => {
  const { user } = useContext(UserContext);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/time-schedule/teacher/${user._id}`);
        setSchedules(res.data || []);
      } catch (err) {
        setError("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };
    if (user && user._id) fetchTimetable();
  }, [user]);

  // Build a grid: day -> hour -> schedule
  const grid = {};
  days.forEach(day => {
    grid[day] = {};
    hours.forEach(hour => {
      grid[day][hour] = null;
    });
  });
  schedules.forEach(slot => {
    if (grid[slot.day] && grid[slot.day][slot.hour]) return;
    if (grid[slot.day]) grid[slot.day][slot.hour] = slot;
  });

  if (loading) return <Loading />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <main className="teacher-timetable-view p-4">
      <h2 className="mb-4 text-3xl font-bold text-violet-900 dark:text-slate-200">My Timetable</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-400 dark:border-slate-600">
          <thead>
            <tr>
              <th className="border border-slate-400 px-2 py-1">Hour</th>
              {days.map(day => (
                <th key={day} className="border border-slate-400 px-2 py-1">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => (
              <tr key={hour}>
                <td className="border border-slate-400 px-2 py-1 font-semibold">{hour}</td>
                {days.map(day => {
                  const slot = grid[day][hour];
                  return (
                    <td key={day} className="border border-slate-400 px-2 py-1 text-sm">
                      {slot ? (
                        <div>
                          <div className="font-medium">{slot.paper?.paper}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Section: {slot.section}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default TeacherTimetableView; 