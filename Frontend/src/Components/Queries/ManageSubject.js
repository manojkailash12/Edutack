import { useContext } from "react";
import UserContext from "../../Hooks/UserContext";

const ManageSubject = () => {
  const { user } = useContext(UserContext);

  if (user.role !== "HOD") {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">Only HOD can access this page.</p>
      </div>
    );
  }

  return (
    <main className="manage-subject">
      <h2 className="mb-2 mt-3 text-4xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
        Manage Subject
      </h2>
      <h3 className="text-2xl font-semibold mb-6">
        Department: {user.department}
      </h3>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-4">Subject Management</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View, edit, and manage all subjects in your department curriculum.
          </p>
          <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg">
            <p className="text-violet-800 dark:text-violet-200">
              <span className="inline-block w-2 h-2 bg-violet-500 rounded-full mr-2"></span>
              Feature in development! Subject management system coming soon.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ManageSubject;