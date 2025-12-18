# 🎓 EDUTRACK - Educational Management System

A comprehensive full-stack educational management system built with React.js, Node.js, Express, and MongoDB. EDUTRACK streamlines academic operations, attendance tracking, payroll management, and certificate generation for educational institutions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## 🌟 Key Features

### 👨‍💼 **Admin Management**
- **Dashboard Analytics**: Comprehensive overview of students, staff, departments, and system metrics
- **Academic Calendar**: Create and manage holidays, exams, and academic events
- **Staff Management**: Complete CRUD operations for staff members with approval workflow
- **Student Management**: Manage student records, enrollments, and academic data
- **Salary Management**: 
  - Hours-based salary calculation system
  - Automated payslip generation with PDF export
  - Email delivery of payslips to staff
  - Perfect attendance bonus (Rs. 1,500/month)
  - Salary reports with Excel and PDF export
- **Attendance Tracking**: Admin self-attendance with check-in/check-out system
- **Certificate Management**: Generate and manage student certificates
- **Leave Management**: Approve/reject staff leave requests
- **Feedback System**: View and analyze student and staff feedback

### 👨‍🏫 **HOD (Head of Department) Features**
- **Department Dashboard**: Department-specific analytics and insights
- **Staff Attendance Monitoring**: Track and manage department staff attendance
- **Student Leave Approval**: Approve/reject student leave requests
- **Timetable Management**: Create and manage class schedules
- **Paper Management**: Add and configure courses/papers
- **Staff Approval**: Approve new staff registrations

### 👨‍🏫 **Teacher/Staff Features**
- **Attendance Management**: 
  - Daily check-in/check-out system
  - Working hours tracking (9 hours/day standard)
  - Late arrival detection (grace period: 35 minutes)
  - Half-day detection (< 4.5 hours)
- **Payslip Access**: View and download personal payslips with filtering
- **Leave Management**: Submit and track leave requests
- **Feedback System**: Submit and view feedback
- **Teaching Tools**:
  - Assignments creation and management
  - Quiz creation with auto-grading
  - Internal marks management
  - Notes sharing
- **Timetable**: View personal teaching schedule
- **Student Certificates**: Generate certificates for students

### 👨‍🎓 **Student Features**
- **Attendance Tracking**: View personal attendance records
- **Internal Marks**: Access internal assessment marks
- **Assignments**: Submit and track assignments
- **Quizzes**: Take quizzes and view results
- **Notes**: Access course materials and notes
- **Leave Requests**: Submit leave applications
- **Feedback**: Provide course and institutional feedback
- **Certificates**: View and download academic certificates
- **Timetable**: View class schedule

## 💼 **Payroll & Salary System**

### Salary Calculation
- **Hours-Based System**: Precise calculation based on actual working hours
- **Rates**:
  - Hourly Rate: Base salary ÷ (30 days × 9 hours)
  - Daily Rate: Base salary ÷ 30 days
- **Deductions**:
  - Provident Fund: 6% of salary
  - Tax: 5% of total earnings
  - Insurance: Free (no deduction)
- **Bonuses**:
  - Perfect Attendance: Rs. 1,500/month (no late, no leave, no absent, no half-day)

### Payslip Features
- **Automated Generation**: Bulk or individual payslip creation
- **PDF Export**: Professional payslip PDFs with EDUTRACK branding
- **Email Delivery**: Automatic email delivery to staff
- **Regeneration**: Update and regenerate existing payslips
- **Filtering**: Filter by year, month, and department
- **Salary Reports**: Export comprehensive salary reports in Excel/PDF

## 📊 **Attendance System**

### Staff Attendance
- **Check-in/Check-out**: Daily attendance marking with timestamps
- **Working Hours**: Automatic calculation of daily working hours
- **Status Detection**:
  - Present: Check-in before 9:35 AM
  - Late: Check-in after 9:35 AM
  - Half-day: Working hours < 4.5 hours
  - Absent: No check-in
  - On Leave: Approved leave
- **Holiday Integration**: No attendance required on holidays and Sundays

### Student Attendance
- **Class-wise Tracking**: Attendance per paper/course
- **Section Management**: Track attendance by sections
- **Leave Integration**: Approved leaves automatically marked
- **Reports**: Comprehensive attendance reports and analytics

## 🎓 **Certificate System**

### Features
- **Automated Generation**: Generate certificates based on marks
- **Professional Design**: EDUTRACK branded certificate template
- **Grade Calculation**: Automatic SGPA/CGPA calculation
- **PDF Export**: High-quality PDF certificates
- **Email Delivery**: Send certificates via email
- **Bulk Generation**: Generate certificates for multiple students
- **Credit System**: Support for 1, 2, 3, 4, 6, 8, 12 credit courses

### Certificate Details
- Student information with photo
- Course-wise grades and credits
- Grade points and results
- SGPA and CGPA
- Digital signature
- Generation date

## 📅 **Academic Calendar**

### Features
- **Event Management**: Create holidays, exams, and academic events
- **Recurring Events**: Support for weekly, monthly, yearly events
- **Holiday Detection**: Automatic blocking of classes on holidays
- **Integration**: Integrated with attendance and timetable systems
- **Multi-role Access**: Visible to all users (admin, staff, students)

## 🔐 **Authentication & Security**

- **Role-Based Access Control**: Admin, HOD, Teacher, Student roles
- **Secure Authentication**: Password hashing with bcrypt
- **Session Management**: Cookie-based session handling
- **Password Recovery**: Forgot password with email verification
- **OTP Verification**: Email-based OTP for registration

## 🛠️ **Technology Stack**

### Frontend
- **React.js** 18.2.0 - UI framework
- **React Router** - Navigation and routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Toastify** - Notifications
- **React Icons** - Icon library
- **PDFKit** - PDF generation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Nodemailer** - Email service
- **Multer** - File uploads
- **PDFKit** - Server-side PDF generation
- **ExcelJS** - Excel file generation

### Deployment
- **Netlify** - Frontend and backend hosting
- **Netlify Functions** - Serverless backend
- **MongoDB Atlas** - Cloud database

## 📁 **Project Structure**

```
Edutack/
├── Frontend/                 # React frontend application
│   ├── public/              # Static files
│   ├── src/
│   │   ├── Components/      # React components
│   │   │   ├── Forms/       # Form components
│   │   │   ├── Layouts/     # Layout components
│   │   │   └── Queries/     # Data display components
│   │   ├── config/          # Configuration files
│   │   ├── Hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   ├── netlify.toml         # Netlify configuration
│   └── package.json
│
├── Backend/                  # Node.js backend API
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   ├── middleware/          # Custom middleware
│   ├── utils/               # Utility functions
│   ├── netlify/
│   │   └── functions/       # Netlify serverless functions
│   ├── netlify.toml         # Netlify configuration
│   └── package.json
│
├── DEPLOYMENT_GUIDE.md      # Deployment instructions
├── prepare-deployment.js    # Deployment preparation script
└── README.md               # This file
```

## 🚀 **Getting Started**

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Gmail account with App Password (for email features)

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/manojkailash12/Edutack.git
cd Edutack
```

2. **Install dependencies**
```bash
# Install all dependencies
npm run install-all

# Or install separately
cd Frontend && npm install
cd ../Backend && npm install
```

3. **Configure environment variables**

Backend `.env`:
```env
DATABASE_URI=your_mongodb_connection_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
NODE_ENV=development
PORT=3500
```

Frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:3500
```

4. **Start development servers**
```bash
# Start backend (from Backend directory)
npm start

# Start frontend (from Frontend directory)
npm start
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend: http://localhost:3500

## 📦 **Deployment**

### Netlify Deployment

Follow the comprehensive guide in `DEPLOYMENT_GUIDE.md` for step-by-step deployment instructions.

**Quick Steps:**
1. Push code to GitHub
2. Deploy backend to Netlify
3. Update frontend API URL
4. Deploy frontend to Netlify
5. Configure environment variables

## 🎯 **Key Highlights**

### Performance Optimizations
- Lazy loading for components
- API response caching
- Optimized database queries
- Asset optimization
- Code splitting

### User Experience
- Responsive design for all devices
- Dark mode support
- Real-time notifications
- Instant feedback
- Intuitive navigation

### Data Management
- Automated backups
- Data validation
- Error handling
- Audit trails
- Export capabilities

## 📊 **System Capabilities**

- **Multi-department Support**: Manage multiple departments independently
- **Scalable Architecture**: Handle growing number of users and data
- **Real-time Updates**: Instant data synchronization
- **Comprehensive Reports**: Generate detailed reports for all modules
- **Email Notifications**: Automated email alerts and notifications
- **File Management**: Upload and manage documents, assignments, notes
- **Bulk Operations**: Perform operations on multiple records simultaneously

## 🔧 **Configuration**

### Credit System
Allowed credit values for courses: **1, 2, 3, 4, 6, 8, 12**

### Working Hours
- Standard working day: **9 hours**
- Grace period for late: **35 minutes** (9:35 AM)
- Half-day threshold: **4.5 hours**

### Salary Deductions
- Provident Fund: **6%**
- Tax: **5%**
- Insurance: **Free**

### Bonuses
- Perfect Attendance: **Rs. 1,500/month**

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 **License**

This project is licensed under the MIT License.

## 👨‍💻 **Author**

**Manoj Kailash**
- GitHub: [@manojkailash12](https://github.com/manojkailash12)

## 🙏 **Acknowledgments**

- React.js community
- Node.js community
- MongoDB team
- Netlify for hosting
- All contributors and testers

## 📞 **Support**

For support, email: libroflow8@gmail.com

---

**Made with ❤️ for Educational Institutions**

*EDUTRACK - Simplifying Education Management*
