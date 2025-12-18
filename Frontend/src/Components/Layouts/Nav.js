import { useContext } from "react";
import { NavLink } from "react-router-dom";
import UserContext from "../../Hooks/UserContext";
import { GiBookshelf } from "react-icons/gi";
import { IoCalendarOutline } from "react-icons/io5";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { AiOutlineSchedule } from "react-icons/ai";
import { BiBookAdd } from "react-icons/bi";
import { RiUserAddLine } from "react-icons/ri";
import { PiStudent, PiUser, PiBooks } from "react-icons/pi";
import { FaChartBar, FaCalendarAlt, FaClipboardList, FaQuestionCircle } from "react-icons/fa";

const Nav = () => {
  const { user } = useContext(UserContext);
  return (
    <nav
      id="nav"
      className="z-0 hidden h-full w-64 flex-col justify-stretch bg-slate-950 px-4 py-4 text-slate-100  dark:bg-slate-950 dark:from-65% lg:flex "
    >
      <ul className="flex flex-grow flex-col items-center justify-start gap-[6px] overflow-y-auto pr-2">
        {user.role !== "admin" && (
          <NavLink to={"./paper"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <GiBookshelf className="pt-[0.1rem] text-2xl  " />
              Papers
            </li>
          </NavLink>
        )}
        {user.role !== "admin" && (
          <NavLink to={"./attendance"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
              Attendance
            </li>
          </NavLink>
        )}
        {user.role !== "admin" && (
          <NavLink to={"./internal"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
              Internal Mark
            </li>
          </NavLink>
        )}
        {user.role === "HOD" && (
          <NavLink to={"./time_schedule"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <AiOutlineSchedule className="pt-[0.1rem] text-2xl  " />
              Time Schedule
            </li>
          </NavLink>
        )}

        {user.role === "HOD" && (
          <>
            <NavLink to={"./add_paper"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <BiBookAdd className="pt-[0.1rem] text-2xl  " />
                Add Paper
              </li>
            </NavLink>
            <NavLink to={"./approve_staff"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <RiUserAddLine className="pt-[0.1rem] text-2xl  " />
                Approve Staff
              </li>
            </NavLink>
            <NavLink to={"./hod_dashboard"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <FaChartBar className="pt-[0.1rem] text-2xl  " />
                HOD Dashboard
              </li>
            </NavLink>
            <NavLink to={"./semester_settings"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <FaCalendarAlt className="pt-[0.1rem] text-2xl  " />
                Semester Settings
              </li>
            </NavLink>
          </>
        )}
        {user.role === "student" && (
          <NavLink to={"./join_paper"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <PiBooks className="pt-[0.1rem] text-2xl  " />
              Manage Paper
            </li>
          </NavLink>
        )}

        {user.role !== "admin" && (
          <NavLink to={"./assignments"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <FaClipboardList className="pt-[0.1rem] text-2xl  " />
              Assignments
            </li>
          </NavLink>
        )}
        {user.role !== "admin" && (
          <NavLink to={"./quizzes"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <FaQuestionCircle className="pt-[0.1rem] text-2xl  " />
              Quizzes
            </li>
          </NavLink>
        )}
        {user.role !== "admin" && (
          <NavLink to={"./my_timetable"} className="w-full font-medium">
            <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
              <FaCalendarAlt className="pt-[0.1rem] text-2xl  " />
              My Timetable
            </li>
          </NavLink>
        )}

        {/* Divider */}
        <li className="w-full border-t border-slate-700 my-2"></li>

        {/* Student-specific navigation */}
        {user.role === "student" && (
          <>
            <NavLink to={"./submit_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Submit Feedback
              </li>
            </NavLink>
            <NavLink to={"./my_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                My Feedback
              </li>
            </NavLink>
            <NavLink to={"./submit_leave"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Submit Leave
              </li>
            </NavLink>
            <NavLink to={"./my_leave_requests"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                My Leave Requests
              </li>
            </NavLink>
            <NavLink to={"./my_certificates"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                My Certificates
              </li>
            </NavLink>
          </>
        )}

        {/* Staff-specific navigation */}
        {(user.role === "teacher" || user.role === "HOD") && (
          <>
            <NavLink to={"./staff_attendance"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                My Attendance
              </li>
            </NavLink>
            <NavLink to={"./submit_staff_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Submit Feedback
              </li>
            </NavLink>
            <NavLink to={"./my_staff_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                My Feedback
              </li>
            </NavLink>
            <NavLink to={"./submit_staff_leave"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Submit Leave
              </li>
            </NavLink>
            <NavLink to={"./my_leave_requests"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                My Leave Requests
              </li>
            </NavLink>
            <NavLink to={"./staff_certificates"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Student Certificates
              </li>
            </NavLink>
            <NavLink to={"./my_payslips"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                My Payslips
              </li>
            </NavLink>
          </>
        )}

        {/* HOD Management Section */}
        {user.role === "HOD" && (
          <li className="w-full border-t border-slate-700 my-2"></li>
        )}

        {/* HOD-specific navigation */}
        {user.role === "HOD" && (
          <>
            <NavLink to={"./add_staff"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <RiUserAddLine className="pt-[0.1rem] text-2xl  " />
                Add Staff
              </li>
            </NavLink>
            <NavLink to={"./manage_staff"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiUser className="pt-[0.1rem] text-2xl  " />
                Manage Staff
              </li>
            </NavLink>
            <NavLink to={"./add_student"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiStudent className="pt-[0.1rem] text-2xl  " />
                Add Student
              </li>
            </NavLink>
            <NavLink to={"./manage_students"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiStudent className="pt-[0.1rem] text-2xl  " />
                Manage Students
              </li>
            </NavLink>
            <NavLink to={"./manage_course"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiBooks className="pt-[0.1rem] text-2xl  " />
                Manage Course
              </li>
            </NavLink>
            <NavLink to={"./view_attendance"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                View Attendance
              </li>
            </NavLink>
            <NavLink to={"./student_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Student Feedback
              </li>
            </NavLink>
            <NavLink to={"./staff_feedback"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Staff Feedback
              </li>
            </NavLink>
            <NavLink to={"./student_leave"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Student Leave
              </li>
            </NavLink>
            <NavLink to={"./staff_leave"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Staff Leave
              </li>
            </NavLink>
            <NavLink to={"./manage_staff_attendance"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Staff Attendance
              </li>
            </NavLink>

          </>
        )}

        {/* Admin-specific navigation */}
        {user.role === "admin" && (
          <>
            <li className="w-full border-t border-slate-700 my-2"></li>
            <NavLink to={"./admin_dashboard"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <FaChartBar className="pt-[0.1rem] text-2xl  " />
                Admin Dashboard
              </li>
            </NavLink>
            <NavLink to={"./academic_calendar"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <FaCalendarAlt className="pt-[0.1rem] text-2xl  " />
                Academic Calendar
              </li>
            </NavLink>
            <NavLink to={"./all_staff_management"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiUser className="pt-[0.1rem] text-2xl  " />
                All Staff Management
              </li>
            </NavLink>
            <NavLink to={"./all_student_management"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <PiStudent className="pt-[0.1rem] text-2xl  " />
                All Student Management
              </li>
            </NavLink>
            <NavLink to={"./salary_management"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Salary Management
              </li>
            </NavLink>
            <NavLink to={"./my_payslips"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                My Payslips
              </li>
            </NavLink>
            <NavLink to={"./admin_attendance"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                My Attendance
              </li>
            </NavLink>
            <NavLink to={"./all_attendance_reports"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                All Attendance Reports
              </li>
            </NavLink>
            <NavLink to={"./all_feedback_reports"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                All Feedback Reports
              </li>
            </NavLink>
            <NavLink to={"./staff_leave"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <IoCalendarOutline className="pt-[0.1rem] text-2xl  " />
                Staff Leave Management
              </li>
            </NavLink>
            <NavLink to={"./admin_certificate_manager"} className="w-full font-medium">
              <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
                <HiOutlineDocumentReport className="pt-[0.1rem] text-2xl  " />
                Certificate Management
              </li>
            </NavLink>
          </>
        )}
      </ul>
      <ul className="flex flex-col items-start justify-end gap-[6px] mt-4 border-t border-slate-700 pt-4">
        <NavLink to={"./profile"} className="w-full font-medium">
          <li className="flex gap-2 duration-200 rounded-md px-4 py-2 hover:bg-violet-600/40 ">
            {user.role === "student" ? (
              <PiStudent className="pt-[0.1rem] text-2xl" />
            ) : (
              <PiUser className="pt-[0.1rem] text-2xl" />
            )}
            {user.name}
          </li>
        </NavLink>
      </ul>
    </nav>
  );
};

export default Nav;
