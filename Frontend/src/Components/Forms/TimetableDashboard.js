import { useState } from "react";
import GenerateTimetable from "./TimeScheduleForm";
// You can add more imports for each tab's component as you build them

const TimetableDashboard = () => {
  const [tab, setTab] = useState("generate");

  return (
    <main className="p-4">
      <h2 className="mb-4 text-3xl font-bold text-violet-900 dark:text-slate-200">HOD Timetable Dashboard</h2>
      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab("generate")} className={tab === "generate" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>Generate Timetable</button>
        <button onClick={() => setTab("view-section")} className={tab === "view-section" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>View/Edit by Section</button>
        <button onClick={() => setTab("view-all")} className={tab === "view-all" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>View All Schedules</button>
        <button onClick={() => setTab("view-dept")} className={tab === "view-dept" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>View by Dept/Sem/Year</button>
        <button onClick={() => setTab("view-teacher")} className={tab === "view-teacher" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>View by Teacher</button>
        <button onClick={() => setTab("changes")} className={tab === "changes" ? "bg-violet-700 text-white px-4 py-2 rounded" : "bg-slate-200 px-4 py-2 rounded"}>Timetable Changes</button>
      </div>
      {tab === "generate" && <GenerateTimetable />}
      {/* Add more tab content here as you build each feature */}
      {tab !== "generate" && <div className="text-gray-500">This feature is coming soon. Let me know if you want to prioritize a specific tab next!</div>}
    </main>
  );
};

export default TimetableDashboard; 