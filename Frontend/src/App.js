import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";

// context
import { UserProvider } from "./Hooks/UserContext";

// components
import Loading from "./Components/Layouts/Loading";
// layouts
import AppLayout from "./Components/Layouts/AppLayout";
import Layout from "./Components/Layouts/Layout";
import Dash from "./Components/Layouts/Dash";
import ErrorElement from "./Components/Layouts/ErrorElement";
import AttendanceLayout from "./Components/Layouts/AttendanceLayout";
import InternalLayout from "./Components/Layouts/InternalLayout";
import RegisterLayout from "./Components/Layouts/RegisterLayout";

// queries
import Paper from "./Components/Queries/Paper";
import Notes from "./Components/Queries/Notes";
import StudentsList from "./Components/Queries/StudentsList";
import Profile from "./Components/Queries/Profile";
import TeacherTimetableView from "./Components/Queries/TeacherTimetableView";
import TimeScheduleForm from "./Components/Forms/TimeScheduleForm";
import TeacherTimetable from "./Components/Queries/TeacherTimetable";
import AssignmentList from "./Components/Queries/AssignmentList";
import QuizList from "./Components/Queries/QuizList";
import AssignmentSubmitForm from "./Components/Forms/AssignmentSubmitForm";
import QuizTakeForm from "./Components/Forms/QuizTakeForm";
import QuizResults from "./Components/Queries/QuizResults";
import QuizReview from "./Components/Queries/QuizReview";
import SubmissionViewer from "./Components/Queries/SubmissionViewer";


// forms
import StaffForm from "./Components/Forms/StaffForm";
import StudentForm from "./Components/Forms/StudentForm";
import NotesForm from "./Components/Forms/NotesForm";
import Login from "./Components/Forms/Login";
import TimetableDashboard from "./Components/Forms/TimetableDashboard";
import SemesterSettings from "./Components/Forms/SemesterSettings";
import AssignmentForm from "./Components/Forms/AssignmentForm";
import QuizForm from "./Components/Forms/QuizForm";
import RegisterForm from "./Components/Forms/RegisterForm";

// lazy loading user specific components
const StaffApproval = lazy(() =>
  import("./Components/Queries/StaffApproval")
);
const PaperForm = lazy(() => import("./Components/Forms/PaperForm"));
const JoinPaper = lazy(() => import("./Components/Forms/JoinPaper"));
const HODDashboard = lazy(() => import("./Components/Queries/HODDashboard"));

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<AppLayout />} errorElement={<ErrorElement />}>
        <Route index element={<Login />} />
        <Route path="/register" element={<RegisterLayout />}>
          <Route path="reg_staff" element={<StaffForm />} />
          <Route path="reg_student" element={<StudentForm />} />
          <Route path="otp-register" element={<RegisterForm />} />
        </Route>
        <Route
          path="/dash"
          element={<Layout />}
          errorElement={<ErrorElement />}
        >
          <Route index element={<Dash />} />
          <Route path="paper" element={<Paper />} />
          <Route path="paper/:paper" element={<Notes />} />
          <Route path="paper/:paper/add" element={<NotesForm />} />
          <Route path="paper/:paper/:note/edit" element={<NotesForm />} />
          <Route path="paper/:paper/students" element={<StudentsList />} />
          <Route path="attendance" element={<AttendanceLayout />} />
          <Route path="internal" element={<InternalLayout />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="approve_staff"
            element={
              <Suspense fallback={<Loading />}>
                <StaffApproval />
              </Suspense>
            }
          />
          <Route
            path="add_paper"
            element={
              <Suspense fallback={<Loading />}>
                <PaperForm />
              </Suspense>
            }
          />
          <Route
            path="hod_dashboard"
            element={
              <Suspense fallback={<Loading />}>
                <HODDashboard />
              </Suspense>
            }
          />
          <Route
            path="join_paper"
            element={
              <Suspense fallback={<Loading />}>
                <JoinPaper />
              </Suspense>
            }
          />
          <Route path="my_timetable" element={<TeacherTimetableView />} />
          <Route path="time_schedule" element={<TimeScheduleForm />} />
          <Route path="teacher_timetable" element={<TeacherTimetable />} />
          <Route path="hod_timetable" element={<TimetableDashboard />} />
          <Route path="semester_settings" element={<SemesterSettings />} />
          <Route path="assignments" element={<AssignmentList />} />
          <Route path="assignments/:assignmentId/submit" element={<AssignmentSubmitForm />} />
          <Route path="assignments/:assignmentId/submissions" element={<SubmissionViewer />} />
          <Route path="assignments/:assignmentId/edit" element={<AssignmentForm />} />
          <Route path="assignments/add-assignment" element={<AssignmentForm />} />
          <Route path="submissions/:type/:id" element={<SubmissionViewer />} />
          <Route path="quizzes" element={<QuizList />} />
          <Route path="quizzes/:quizId/take" element={<QuizTakeForm />} />
          <Route path="quizzes/:quizId/results" element={<QuizResults />} />
          <Route path="quizzes/:quizId/review" element={<QuizReview />} />
          <Route path="quizzes/:quizId/edit" element={<QuizForm />} />
          <Route path="quizzes/add-quiz" element={<QuizForm />} />
        </Route>
      </Route>
    )
  );

  return (
    <UserProvider>
      <RouterProvider router={router} />
      <ToastContainer
        className="toast"
        toastClassName="toast-rounded"
        bodyClassName="toast-body"
        // progressClassName="toast-progress"
        position="bottom-right"
        autoClose={5000}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        hideProgressBar={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </UserProvider>
  );
}

export default App;
