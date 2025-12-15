import { Link } from "react-router-dom";
import { GiBookshelf } from "react-icons/gi";
import { IoCalendarOutline } from "react-icons/io5";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { AiOutlineSchedule } from "react-icons/ai";
import { BiBookAdd } from "react-icons/bi";
import { RiUserAddLine } from "react-icons/ri";
import { PiBooks, PiUser, PiStudent } from "react-icons/pi";
import { useContext, useEffect, useCallback } from "react";
import UserContext from "../../Hooks/UserContext";
import axios from "../../config/api/axios";
import { FaChartBar, FaClipboardList, FaQuestionCircle, FaCalendarAlt } from "react-icons/fa";

const Dash = () => {
  const { user, setPaperList } = useContext(UserContext);

  const getPapers = useCallback(async () => {
    try {
      console.log('=== DASH GET PAPERS DEBUG ===');
      console.log('Full user object:', user);
      console.log('User ID:', user._id);
      console.log('User type:', user.userType);
      console.log('User role:', user.role);
      
      // Use correct endpoint based on user type
      let endpoint;
      if (user.userType === 'staff') {
        endpoint = `paper/staff/${user._id}`;
      } else if (user.userType === 'student') {
        endpoint = `paper/student/${user._id}`;
      } else {
        console.error('Unknown user type:', user.userType);
        return;
      }
      
      console.log('Making request to:', endpoint);
      const response = await axios.get(endpoint);
      console.log('Papers API response:', response.data);
      setPaperList(response.data);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  }, [user, setPaperList]);

  useEffect(() => {
    if (user._id && user.userType) {
      getPapers();
    }
  }, [getPapers, user._id, user.userType]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (user._id && user.userType) {
      const interval = setInterval(() => {
        getPapers();
      }, 15000); // 15 seconds

      return () => clearInterval(interval);
    }
  }, [getPapers, user._id, user.userType]);

  return (
    <main className="self-center">
      <h2 className="m-6 font-spectral mx-auto text-center text-6xl font-bold dark:text-slate-400">
        EDUTRACK
      </h2>
      <div className="grid grid-cols-1 place-content-center gap-3 px-1 py-4 lg:grid-cols-2 lg:gap-4 lg:px-8 xl:grid-cols-3">
        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./paper"}
        >
          <GiBookshelf className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Papers
            <p className="text-sm font-normal lg:text-base ">
              View Papers and Notes
            </p>
          </div>
        </Link>

        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./attendance"}
        >
          <IoCalendarOutline className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Attendance
            <p className="text-sm font-normal lg:text-base ">
              Add or Edit Attendance
            </p>
          </div>
        </Link>

        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./internal"}
        >
          <HiOutlineDocumentReport className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Internal Mark
            <p className="text-sm font-normal lg:text-base ">
              View or Edit Internal Marks
            </p>
          </div>
        </Link>

        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./time_schedule"}
        >
          <AiOutlineSchedule className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Time Schedule
            <p className="text-sm font-normal lg:text-base ">
              View or Edit Time Schedule
            </p>
          </div>
        </Link>



        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./assignments"}
        >
          <FaClipboardList className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Assignments
            <p className="text-sm font-normal lg:text-base ">
              View and Submit Assignments
            </p>
          </div>
        </Link>

        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./quizzes"}
        >
          <FaQuestionCircle className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            Quizzes
            <p className="text-sm font-normal lg:text-base ">
              Take Quizzes and View Results
            </p>
          </div>
        </Link>

        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./my_timetable"}
        >
          <FaCalendarAlt className="text-[2.5rem] lg:text-[4rem] " />
          <div className="font-semibold">
            My Timetable
            <p className="text-sm font-normal lg:text-base ">
              View Your Class Schedule
            </p>
          </div>
        </Link>

        {(user.role === "teacher" || user.role === "HOD") && (
          <Link
            className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
            to={"./teacher_timetable"}
          >
            <FaCalendarAlt className="text-[2.5rem] lg:text-[4rem] " />
            <div className="font-semibold">
              Teacher Timetable
              <p className="text-sm font-normal lg:text-base ">
                Manage Class Schedules
              </p>
            </div>
          </Link>
        )}

        {user.role === "HOD" && (
          <>
            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./add_staff"}
            >
              <RiUserAddLine className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Add Staff
                <p className="text-sm font-normal lg:text-base ">
                  Add New Staff Member
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./manage_staff"}
            >
              <PiUser className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Manage Staff
                <p className="text-sm font-normal lg:text-base ">
                  View and Manage Staff
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./add_student"}
            >
              <PiStudent className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Add Student
                <p className="text-sm font-normal lg:text-base ">
                  Add New Student
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./manage_students"}
            >
              <PiStudent className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Manage Students
                <p className="text-sm font-normal lg:text-base ">
                  View and Manage Students
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./add_paper"}
            >
              <BiBookAdd className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Add Course
                <p className="text-sm font-normal lg:text-base ">
                  Add a New Course/Paper
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./manage_course"}
            >
              <PiBooks className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Manage Course
                <p className="text-sm font-normal lg:text-base ">
                  View and Manage Courses
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./add_subject"}
            >
              <GiBookshelf className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Add Subject
                <p className="text-sm font-normal lg:text-base ">
                  Add New Subject
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./manage_subject"}
            >
              <GiBookshelf className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Manage Subject
                <p className="text-sm font-normal lg:text-base ">
                  View and Manage Subjects
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-green-300 p-6 text-base hover:bg-green-400/90 dark:bg-green-950/80 dark:hover:bg-green-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./view_attendance"}
            >
              <IoCalendarOutline className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                View Attendance
                <p className="text-sm font-normal lg:text-base ">
                  View Department Attendance
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-blue-300 p-6 text-base hover:bg-blue-400/90 dark:bg-blue-950/80 dark:hover:bg-blue-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./student_feedback"}
            >
              <HiOutlineDocumentReport className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Student Feedback
                <p className="text-sm font-normal lg:text-base ">
                  View Student Feedback
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-orange-300 p-6 text-base hover:bg-orange-400/90 dark:bg-orange-950/80 dark:hover:bg-orange-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./staff_feedback"}
            >
              <HiOutlineDocumentReport className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Staff Feedback
                <p className="text-sm font-normal lg:text-base ">
                  View Staff Feedback
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-yellow-300 p-6 text-base hover:bg-yellow-400/90 dark:bg-yellow-950/80 dark:hover:bg-yellow-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./student_leave"}
            >
              <IoCalendarOutline className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Student Leave
                <p className="text-sm font-normal lg:text-base ">
                  Manage Student Leave Requests
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-red-300 p-6 text-base hover:bg-red-400/90 dark:bg-red-950/80 dark:hover:bg-red-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./staff_leave"}
            >
              <IoCalendarOutline className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Staff Leave
                <p className="text-sm font-normal lg:text-base ">
                  Manage Staff Leave Requests
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./approve_staff"}
            >
              <RiUserAddLine className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Approve Staff
                <p className="text-sm font-normal lg:text-base ">
                  Approve registered staff(s)
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./hod_dashboard"}
            >
              <FaChartBar className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                HOD Dashboard
                <p className="text-sm font-normal lg:text-base ">
                  View Department Overview
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./hod_timetable"}
            >
              <FaCalendarAlt className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                HOD Timetable
                <p className="text-sm font-normal lg:text-base ">
                  Manage Department Timetable
                </p>
              </div>
            </Link>

            <Link
              className="flex gap-2 rounded-lg bg-purple-300 p-6 text-base hover:bg-purple-400/90 dark:bg-purple-950/80 dark:hover:bg-purple-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
              to={"./semester_settings"}
            >
              <FaCalendarAlt className="text-[2.5rem] lg:text-[4rem] " />
              <div className="font-semibold">
                Semester Settings
                <p className="text-sm font-normal lg:text-base ">
                  Configure Semester Dates for Attendance
                </p>
              </div>
            </Link>
          </>
        )}
        {user.role === "student" && (
          <Link
            className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
            to={"./join_paper"}
          >
            <PiBooks className="text-[2.5rem] lg:text-[4rem] " />
            <div className="font-semibold">
              Manage Paper
              <p className="text-sm font-normal lg:text-base ">
                Join or Leave Paper
              </p>
            </div>
          </Link>
        )}
        <Link
          className="flex gap-2 rounded-lg bg-violet-300 p-6 text-base hover:bg-violet-400/90 dark:bg-violet-950/80 dark:hover:bg-violet-950 dark:hover:text-slate-300 duration-200 lg:text-lg"
          to={"./profile"}
        >
          {user.role === "student" ? (
            <PiStudent className="text-[2.5rem] lg:text-[4rem] " />
          ) : (
            <PiUser className="text-[2.5rem] lg:text-[4rem] " />
          )}
          <div className="font-semibold">
            Profile
            <p className="text-sm font-normal lg:text-base ">
              View or Edit Profile
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
};

export default Dash;
