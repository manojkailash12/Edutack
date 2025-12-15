# 🎓 Edutrack - College Management System

A comprehensive college-based data management system built with React and Node.js, featuring quiz management, attendance tracking, assignment submission, and more.

## ✨ Features

### 🧑‍🎓 For Students
- **Quiz System**: Take quizzes with real-time timer and instant results
- **Assignment Submission**: Submit assignments with file uploads
- **Attendance Tracking**: View attendance records and statistics
- **Internal Marks**: Check internal assessment marks
- **Profile Management**: Update personal information

### 👨‍🏫 For Teachers
- **Quiz Creation**: Create and manage quizzes with multiple choice questions
- **Assignment Management**: Create assignments and review submissions
- **Attendance Management**: Mark and track student attendance
- **Grade Management**: Input and manage internal marks
- **Student Analytics**: View student performance and statistics

### 👨‍💼 For HODs
- **Staff Approval**: Approve new teacher registrations
- **Department Overview**: Monitor department-wide activities
- **Timetable Management**: Create and manage class schedules
- **Semester Settings**: Configure academic year and semester settings

## 🚀 Recent Updates

### Quiz System Improvements
- ✅ **Instant Results**: Students can view quiz results immediately after submission
- ✅ **Accurate Time Tracking**: Fixed time calculation to show correct minutes and seconds
- ✅ **Better UX**: Improved navigation and result display

### Deployment Ready
- ✅ **Netlify Integration**: Full-stack deployment on Netlify using Functions
- ✅ **Serverless Backend**: Converted Express.js to serverless functions
- ✅ **Production Configuration**: Environment-specific API configurations

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Toastify** - Toast notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Multer** - File upload handling
- **Nodemailer** - Email sending
- **bcrypt** - Password hashing

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Gmail account for email functionality

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/manojkailash12/Edutack.git
   cd Edutack
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   npm install
   
   # Create .env file with your configurations
   cp .env.example .env
   # Edit .env with your MongoDB URI and email credentials
   
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3500

## 🌐 Deployment

### Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy**
   ```bash
   # Build frontend
   cd Frontend
   npm run build
   cd ..
   
   # Deploy to Netlify
   netlify login
   netlify init
   netlify deploy --prod
   ```

3. **Configure Environment Variables**
   - Go to Netlify Dashboard > Site Settings > Environment Variables
   - Add your MongoDB URI, email credentials, etc.

4. **Update CORS Settings**
   - Update the Netlify URL in `Backend/netlify/functions/api.js`
   - Redeploy: `netlify deploy --prod`

For detailed deployment instructions, see [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## 📁 Project Structure

```
Edutack/
├── Frontend/                 # React frontend application
│   ├── src/
│   │   ├── Components/      # React components
│   │   ├── Hooks/          # Custom React hooks
│   │   └── config/         # API configuration
│   └── package.json
├── Backend/                 # Node.js backend application
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── netlify/           # Netlify Functions
│   └── package.json
├── netlify.toml           # Netlify configuration
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file in the Backend directory:

```env
NODE_ENV=development
PORT=3500
MONGODB_URI=your_mongodb_connection_string
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](Frontend/LICENSE.txt) file for details.

## 👨‍💻 Author

**Manoj Kailash**
- GitHub: [@manojkailash12](https://github.com/manojkailash12)

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for educational institutions
- Focused on user experience and performance

---

⭐ Star this repository if you find it helpful!