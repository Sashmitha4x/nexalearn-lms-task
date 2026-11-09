# 🎓 NexaLearn LMS — Full-Stack Enterprise Learning Management System

NexaLearn is a full-stack **MERN (MongoDB, Express.js, React 19, Node.js)** Learning Management System engineered with role-based access control (**Student**, **Instructor**, and **Platform Admin**), real-time state synchronization, interactive timed assessments, automated grading workflows, verifiable PDF certificates, and an immutable cryptographic governance audit ledger.

---

## ✨ Core Features by Role

### 🌐 1. Public Course Catalog & Curriculum Spotlight
- **Dynamic Course Discovery:** Search and filter published courses by domain category, difficulty level, duration, and rating with live category counters.
- **Interactive Curriculum Spotlight:** On-demand inspection of course learning outcomes, module/lesson breakdowns, downloadable syllabus PDFs, and lead instructor bios.
- **Role-Aware Enrollment:** Seamless enrollment flow that detects whether a student is already enrolled and routes them directly to their learning hub.

### 👨‍🎓 2. Student Learning Hub & Interactive Classroom
- **Personal Learning Dashboard:** Real-time KPI tracking for enrolled courses, earned certificates, pending assignments, and average quiz mastery scores.
- **Widescreen Interactive Classroom:** 16:9 HD lesson player with playback speed controls, closed captions, curriculum accordion navigation, and persistent timestamped study journals.
- **3-Stage Timed Quiz Engine:**
  - **Stage 1 (Ready):** Timer remains paused until the student explicitly starts the attempt.
  - **Stage 2 (In Progress):** Live countdown timer with automatic submission upon expiration or manual early submission.
  - **Stage 3 (Locked Review):** Single-attempt enforcement with full question-by-question breakdown highlighting correct and wrong answers alongside instructor explanations.
- **Assignment Submission & Rubric Feedback:** Drag-and-drop deliverable uploader (`.zip`, `.pdf`, `.docx`) with real-time grading status and rubric evaluation breakdowns.
- **Permanent Credential Vault:** View, preview, and download high-resolution landscape PDF certificates for all completed courses—preserved permanently even if a course is later archived or removed from the catalog.

### 👨‍🏫 3. Instructor Studio & Assessment Builder
- **Isolated Per-Course Studio:** Dedicated 4-step workspace (**Basic Info & 16:9 Cover**, **Curriculum Modules**, **Quiz Studio**, and **Assignment Studio**) scoped per course.
- **Custom Quiz & Assignment Authoring:** Create and edit multiple-choice questions (`A`–`D`), designate correct answer keys, configure passing thresholds/time limits, and define project deliverables.
- **Course-Scoped Grading & Quiz Marks:** Filter student assignment submissions and auto-graded quiz scores by course, download student artifacts, and publish numeric grades (`0–100`) with qualitative feedback.
- **Moderation Resolution Workflow:** View admin moderation reasons on hidden courses and submit verification notes directly to the Platform Admin for re-approval.

### 🛡️ 4. Platform Admin Governance Console
- **Real-Time Telemetry & Analytics:** Live gateway health heartbeat, cluster connectivity indicators, catalog growth charts, and category distribution analytics.
- **Course Moderation & Quality Enforcement:** Hide non-compliant courses with actionable audit feedback, review instructor verification notes via the resolution selector, approve/unhide courses, or permanently delete courses with a mandatory governance reason sent to the instructor.
- **User Account Governance & Session Security:** Inspect user dossiers, suspend/reactivate accounts (with immediate live session revocation), or permanently delete Student and Instructor accounts.
- **Immutable Audit Ledger:** Local-time cryptographically stamped governance log with 1-click export to **PDF (`.pdf`)**, **Excel (`.xls`)**, and **CSV (`.csv`)**.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Material Symbols Outlined |
| **Backend** | Node.js, Express.js, RESTful API Architecture |
| **Database** | MongoDB Atlas, Mongoose ODM (with hybrid local persistence fallback) |
| **Authentication & Security** | JSON Web Tokens (JWT), `bcryptjs` (12-round password hashing), Role-Based Access Control (RBAC) |
| **Document Generation** | Native printable PDF generators (Certificates, Syllabuses, Gradebooks, Audit Ledgers), CSV & Excel exporters |

---

## 🔐 Default Demo Credentials

| Role | Name | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | Sashmitha N. | `admin@nexalearn.io` | `Admin@2026!` |
| **Instructor** | Alex Morgan | `alex.morgan@nexalearn.io` | `Instructor@2026!` |
| **Student** | Sashmitha | `test@student1.com` | `Student@1` |

> Users can also register new **Student** or **Instructor** accounts directly from the authentication screen.

---

## 📂 Project Structure

```text
NexaLearn-LMS/
├── client/                     # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # AdminGovernanceView.jsx
│   │   │   ├── auth/           # AuthFlowView.jsx
│   │   │   ├── classroom/      # ClassroomQuizView.jsx
│   │   │   ├── instructor/     # InstructorStudioView.jsx
│   │   │   ├── layout/         # PublicNavbar.jsx, PublicFooter.jsx
│   │   │   ├── public/         # Hero, Catalog, Spotlight, Instructor Directory
│   │   │   ├── student/        # StudentDashboardView.jsx
│   │   │   └── ui/             # NexaSelect.jsx, Toast.jsx
│   │   ├── constants/          # Seed constants & catalog configuration
│   │   ├── hooks/              # useNexaLearn.js (0ms Optimistic State & Sync Engine)
│   │   ├── services/           # nexaService.js (API client & PDF/Excel/CSV exporters)
│   │   ├── App.jsx             # Root application router
│   │   └── main.jsx            # Entry point
│   ├── vercel.json
│   └── package.json
├── server/                     # Node.js + Express + MongoDB Backend API
│   ├── src/
│   │   ├── config/             # MongoDB Atlas connection manager
│   │   ├── controllers/        # Auth, Course, Enrollment, and Admin controllers
│   │   ├── middleware/         # JWT verification & RBAC middleware
│   │   ├── models/             # User, Course, Enrollment, Submission, AuditLog schemas
│   │   ├── routes/             # Express API route definitions (/api/v1/*)
│   │   └── index.js            # Express server entry point
│   ├── vercel.json
│   └── package.json
├── .gitignore
└── README.md