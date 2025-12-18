import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import { initPerformanceOptimizations } from "./utils/preloader";

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
import ManageStaff from "./Components/Queries/ManageStaff";
import ManageStudents from "./Components/Queries/ManageStudents";
import ManageCourse from "./Components/Queries/ManageCourse";
import ViewAttendance from "./Components/Queries/ViewAttendance";
import StudentFeedback from "./Components/Queries/StudentFeedback";
import StaffFeedback from "./Components/Queries/StaffFeedback";
import StudentLeave from "./Components/Queries/StudentLeave";
import StaffLeave from "./Components/Queries/StaffLeave";



// forms
import StaffForm from "./Components/Forms/StaffForm";
import StudentForm from "./Components/Forms/StudentForm";
import NotesForm from "./Components/Forms/NotesForm";
import Login from "./Components/Forms/Login";

import SemesterSettings from "./Components/Forms/SemesterSettings";
import AssignmentForm from "./Components/Forms/AssignmentForm";
import QuizForm from "./Components/Forms/QuizForm";
import RegisterForm from "./Components/Forms/RegisterForm";
import FeedbackForm from "./Components/Forms/FeedbackForm";
import MyFeedback from "./Components/Queries/MyFeedback";
import StaffFeedbackForm from "./Components/Forms/StaffFeedbackForm";
import MyStaffFeedback from "./Components/Queries/MyStaffFeedback";
import StudentLeaveForm from "./Components/Forms/StudentLeaveForm";
import StaffLeaveForm from "./Components/Forms/StaffLeaveForm";
import MyLeaveRequests from "./Components/Queries/MyLeaveRequests";
import StaffAttendanceDashboard from "./Components/Queries/StaffAttendanceDashboard";
import HODStaffAttendance from "./Components/Queries/HODStaffAttendance";

import AdminDashboard from "./Components/Queries/AdminDashboard";
import AdminAttendance from "./Components/Queries/AdminAttendance";
import SalaryManagement from "./Components/Queries/SalaryManagement";
import AllStaffManagement from "./Components/Queries/AllStaffManagement";
import AdminRegistrationForm from "./Components/Forms/AdminRegistrationForm";
import AdminCertificateManager from "./Components/Queries/AdminCertificateManager";
import StudentCertificates from "./Components/Queries/StudentCertificates";
import StaffCertificateViewer from "./Components/Queries/StaffCertificateViewer";
import StaffPayslips from "./Components/Queries/StaffPayslips";
import AdminPayslips from "./Components/Queries/AdminPayslips";
import AcademicCalendar from "./Components/Queries/AcademicCalendar";

// lazy loading user specific components
const StaffApproval = lazy(() =>
  import("./Components/Queries/StaffApproval")
);
const PaperForm = lazy(() => import("./Components/Forms/PaperForm"));
const JoinPaper = lazy(() => import("./Components/Forms/JoinPaper"));
const HODDashboard = lazy(() => import("./Components/Queries/HODDashboard"));

function App() {
  useEffect(() => {
    initPerformanceOptimizations();
  }, []);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<AppLayout />} errorElement={<ErrorElement />}>
        <Route index element={<Login />} />
        <Route path="/register" element={<RegisterLayout />}>
          <Route path="reg_staff" element={<StaffForm />} />
          <Route path="reg_student" element={<StudentForm />} />
          <Route path="reg_admin" element={<AdminRegistrationForm />} />
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
          <Route path="add_staff" element={<StaffForm />} />
          <Route path="manage_staff" element={<ManageStaff />} />
          <Route path="add_student" element={<StudentForm />} />
          <Route path="manage_students" element={<ManageStudents />} />
          <Route path="manage_course" element={<ManageCourse />} />

          <Route path="view_attendance" element={<ViewAttendance />} />
          <Route path="student_feedback" element={<StudentFeedback />} />
          <Route path="submit_feedback" element={<FeedbackForm />} />
          <Route path="my_feedback" element={<MyFeedback />} />
          <Route path="staff_feedback" element={<StaffFeedback />} />
          <Route path="submit_staff_feedback" element={<StaffFeedbackForm />} />
          <Route path="my_staff_feedback" element={<MyStaffFeedback />} />
          <Route path="student_leave" element={<StudentLeave />} />
          <Route path="staff_leave" element={<StaffLeave />} />
          <Route path="submit_leave" element={<StudentLeaveForm />} />
          <Route path="submit_staff_leave" element={<StaffLeaveForm />} />
          <Route path="my_leave_requests" element={<MyLeaveRequests />} />
          <Route path="staff_attendance" element={<StaffAttendanceDashboard />} />
          <Route path="manage_staff_attendance" element={<HODStaffAttendance />} />
          <Route path="staff_certificates" element={<StaffCertificateViewer />} />
          <Route path="my_payslips" element={<StaffPayslips />} />
          
          {/* Admin Routes */}
          <Route path="admin_dashboard" element={<AdminDashboard />} />
          <Route path="academic_calendar" element={<AcademicCalendar />} />
          <Route path="admin_attendance" element={<AdminAttendance />} />
          <Route path="salary_management" element={<SalaryManagement />} />
          <Route path="all_staff_management" element={<AllStaffManagement />} />
          <Route path="all_student_management" element={<ManageStudents />} />
          <Route path="all_attendance_reports" element={<ViewAttendance />} />
          <Route path="all_feedback_reports" element={<StudentFeedback />} />
          <Route path="admin_certificate_manager" element={<AdminCertificateManager />} />
          <Route path="admin_payslips" element={<AdminPayslips />} />
          
          {/* Student Certificate Routes */}
          <Route path="my_certificates" element={<StudentCertificates />} />
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
