<div align="center">

<img src="https://raw.githubusercontent.com/akrout9999-star/campus_desk_gce_kjr/main/public/gcekjr-logo-whitebg.png" alt="GCE Keonjhar Logo" width="110"/>

# 🎓 CampusDesk — GCE Keonjhar

### A Role-Based College Management Web Application

[![Live Demo](https://img.shields.io/badge/Live%20Demo-campus--desk--new.vercel.app-brightgreen?style=for-the-badge&logo=vercel)](https://campus-desk-new.vercel.app/login)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Government College of Engineering, Keonjhar**  
B.Tech — Computer Science & Engineering | 3rd Year, 6th Semester  
Academic Year 2025–26

---

[🔗 Live Demo](https://campus-desk-new.vercel.app/login) · [📋 Features](#-features) · [🏗️ Architecture](#%EF%B8%8F-architecture) · [🚀 Setup Guide](#-local-setup-guide) · [👥 Team](#-team)

</div>

---

## 📌 Overview

**CampusDesk** is a full-stack, role-based college management portal built specifically for Government College of Engineering, Keonjhar. It replaces fragmented manual processes — paper attendance registers, printed mark sheets, WhatsApp note-sharing — with a unified, real-time digital platform.

The system supports **four distinct user roles** (Student, Class Representative, Teacher, Admin), each with a tailored dashboard and access-controlled features. Everything runs in the browser — no app installation required.

> Built with React + Firebase, deployed on Vercel. Free to host, easy to self-deploy for any engineering college.

---

## ✨ Features

### 👨‍🎓 Student Portal
| Feature | Description |
|---|---|
| **Dashboard** | At-a-glance attendance %, marks count, notes count |
| **Attendance Tracker** | Subject-wise attendance with percentage and class count |
| **Marks Viewer** | Internal marks across all exam sessions and subjects |
| **BPUT Result** | Fetch official BPUT exam results by roll number & DOB |
| **Notes Library** | Access Google Drive notes uploaded by CR |
| **Timetable** | View current class timetable |
| **Syllabus** | Browse department syllabus |
| **Notice Board** | College announcements and notices |
| **Placement Board** | Placement drives and opportunities |
| **Assignments** | View assignments posted by teachers with due dates |

### 🧑‍💼 Class Representative (CR)
Everything the Student has, plus:
| Feature | Description |
|---|---|
| **Upload Notes** | Post Google Drive links for class notes by subject |

### 👨‍🏫 Teacher Portal
| Feature | Description |
|---|---|
| **Dashboard** | Overview of assigned departments & upcoming tasks |
| **Take Attendance** | Mark attendance per subject, date & section — mobile-friendly |
| **Enter Marks** | Enter internal marks for any exam session and subject |
| **View Marks** | Browse/export marks for any department & semester |
| **View Attendance** | Analyse class-wise attendance records |
| **Manage Assignments** | Post, edit and delete assignments with Google Drive links |
| **BPUT Bulk Results** | Fetch BPUT results for entire batch at once |

### 🛡️ Admin Portal
| Feature | Description |
|---|---|
| **Dashboard** | College-wide stats at a glance |
| **Import CSV** | Bulk-create student/teacher/CR accounts from a CSV file |
| **Manage Users** | View, search and manage all registered users |
| **Manage Subjects** | Add/update subjects per department and semester |
| **Manage Timetable** | Create and publish timetables for each class |
| **Manage Exam Sessions** | Create exam sessions (Mid-Sem 1, End-Sem, etc.) |
| **View Marks & Attendance** | Admin-level access to all records |
| **BPUT Bulk Results** | Admin-level batch result fetching |

---

## 🏗️ Architecture

```
campus-desk/
├── api/
│   ├── bput-student.js        ← Vercel serverless: fetch single BPUT result
│   └── bput-bulk.js           ← Vercel serverless: fetch batch BPUT results
│
├── public/
│   └── logo-gcekj.png         ← College logo (browser tab icon)
│
└── src/
    ├── main.jsx               ← React entry point
    ├── App.jsx                ← All routes with role-based protection
    ├── firebase.js            ← Firebase SDK initialisation
    ├── index.css              ← Global styles
    │
    ├── assets/
    │   └── logo-gcekj.png
    │
    ├── contexts/
    │   └── AuthContext.jsx    ← Auth state, login/logout, profile loading
    │
    ├── components/
    │   ├── AppShell.jsx       ← Page layout with sidebar
    │   ├── Sidebar.jsx        ← Role-aware navigation sidebar
    │   ├── ProtectedRoute.jsx ← Route guard by role
    │   ├── Logo.jsx           ← Logo component
    │   └── Spinner.jsx        ← Loading indicator
    │
    ├── pages/
    │   ├── Login.jsx
    │   ├── NoticeBoard.jsx
    │   ├── PlacementBoard.jsx
    │   ├── Timetable.jsx
    │   ├── Syllabus.jsx
    │   │
    │   ├── student/
    │   │   ├── StudentDashboard.jsx
    │   │   ├── StudentAttendance.jsx
    │   │   ├── StudentMarks.jsx
    │   │   ├── StudentNotes.jsx
    │   │   ├── StudentAssignments.jsx
    │   │   └── BputResult.jsx
    │   │
    │   ├── cr/
    │   │   ├── CRDashboard.jsx
    │   │   └── UploadNotes.jsx
    │   │
    │   ├── teacher/
    │   │   ├── TeacherDashboard.jsx
    │   │   ├── TakeAttendance.jsx
    │   │   ├── EnterMarks.jsx
    │   │   ├── ViewMarks.jsx
    │   │   ├── ViewAttendance.jsx
    │   │   ├── ManageAssignments.jsx
    │   │   └── BputBulk.jsx
    │   │
    │   └── admin/
    │       ├── AdminDashboard.jsx
    │       ├── ImportCSV.jsx
    │       ├── AdminUsers.jsx
    │       ├── ManageSubjects.jsx
    │       ├── ManageTimetable.jsx
    │       └── ManageExamSessions.jsx
    │
    └── utils/
        └── roles.js           ← Role constants, departments list, semesters
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Vite 5 |
| **Backend / Database** | Firebase Firestore (NoSQL, real-time) |
| **Authentication** | Firebase Auth (Email + Password) |
| **Serverless API** | Vercel Edge Functions (BPUT result scraping) |
| **CSV Parsing** | PapaParse |
| **Excel Export** | SheetJS (xlsx) |
| **Hosting** | Vercel (free tier) |
| **Styling** | Custom CSS with CSS Variables |

---

## 🔐 Role & Access Matrix

| Feature | Student | CR | Teacher | Admin |
|---|:---:|:---:|:---:|:---:|
| View Attendance | ✅ | ✅ | ✅ | ✅ |
| Take Attendance | ❌ | ❌ | ✅ | ❌ |
| View Marks | ✅ | ✅ | ✅ | ✅ |
| Enter Marks | ❌ | ❌ | ✅ | ❌ |
| View Notes | ✅ | ✅ | ❌ | ❌ |
| Upload Notes | ❌ | ✅ | ❌ | ❌ |
| Manage Assignments | ❌ | ❌ | ✅ | ❌ |
| View Assignments | ✅ | ✅ | ❌ | ❌ |
| BPUT Result (own) | ✅ | ✅ | ❌ | ❌ |
| BPUT Bulk Results | ❌ | ❌ | ✅ | ✅ |
| Import CSV | ❌ | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Manage Subjects | ❌ | ❌ | ❌ | ✅ |
| Manage Timetable | ❌ | ❌ | ❌ | ✅ |

---

## 🏫 Departments Supported

CampusDesk supports all **10 engineering departments** of GCE Keonjhar:

| Short | Full Name |
|---|---|
| CSE | Computer Science & Engineering |
| IT | Information Technology |
| ETC | Electronics & Telecommunication Engineering |
| EE | Electrical Engineering |
| ME | Mechanical Engineering |
| CE | Civil Engineering |
| MNG | Mining Engineering |
| MIN | Mineral Engineering |
| MME | Metallurgical & Materials Engineering |
| CHE | Chemical Engineering |

---

## 🚀 Local Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org) (LTS version recommended)
- A [Firebase](https://console.firebase.google.com) account (free)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/akrout9999-star/campus_desk_gce_kjr.git
cd campus_desk_gce_kjr
```

---

### Step 2 — Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add Project** → name it `campus-desk`
2. **Enable Authentication:**
   - Build → Authentication → Get Started → Email/Password → Enable → Save
3. **Enable Firestore:**
   - Build → Firestore Database → Create Database → Start in test mode → Select region → Enable
4. **Get your config:**
   - ⚙️ Gear icon → Project Settings → Your Apps → Click `</>` (Web)
   - Register app as `campusdesk` → Copy the `firebaseConfig` object

---

### Step 3 — Configure Environment Variables

Copy the example file and fill in your Firebase values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=campus-desk-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campus-desk-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=campus-desk-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> ⚠️ **Never commit `.env` to GitHub.** It is already in `.gitignore`.

---

### Step 4 — Install Dependencies & Run

```bash
npm install
npm run dev
```

Open your browser at: **http://localhost:5173** ✅

---

### Step 5 — Create the First Admin Account

Since there are no users yet, create the admin manually in Firebase:

**Firebase Console → Authentication → Users → Add User:**
- Email: `admin@campusdesk.internal`
- Password: *(choose a strong password)*
- Copy the **UID** shown

**Firebase Console → Firestore → Add Document:**
- Collection: `users`
- Document ID: *(paste the UID)*
- Fields:
  ```
  name       (string)  → Admin
  rollNo     (string)  → ADMIN001
  department (string)  → Administration
  semester   (number)  → 1
  role       (string)  → admin
  email      (string)  → admin@campusdesk.internal
  ```

Log in with roll number `ADMIN001` and your chosen password.

---

### Step 6 — Import Users via CSV

Once logged in as Admin → go to **Import CSV**. Use this format:

```csv
name,rollNo,department,semester,role,password
Ravi Kumar,2301CSE001,Computer Science & Engineering,3,student,Pass@1234
Priya Das,2301CSE002,Computer Science & Engineering,3,cr,Pass@5678
Dr. Mohan Singh,TCH001,Computer Science & Engineering,3,teacher,Teacher@123
```

**Rules:**
- `role` must be: `student`, `cr`, `teacher`, or `admin`
- `department` must exactly match one of the 10 department names above
- `semester` is `1`–`8`
- `password` must be at least 6 characters

---

## ☁️ Deploy to Vercel (Free)

```bash
# 1. Push your code to GitHub
git add .
git commit -m "initial commit"
git push origin main
```

2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub → **New Project** → Import your repo
3. Add all `VITE_FIREBASE_*` environment variables
4. Click **Deploy** → Get your free URL like `campus-desk.vercel.app` 🚀

---

## 🔒 Firestore Security Rules

After testing, lock down your database in **Firestore → Rules**:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /attendance/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }

    match /marks/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }

    match /notes/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['cr', 'admin'];
    }

    match /assignments/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }
  }
}
```

---

## 👥 Team

This project was developed as part of the B.Tech (CSE) curriculum at **Government College of Engineering, Keonjhar**.

| Name | Role |
|---|---|
| **Asish Kumar Rout** | Team Member |
| **Biswajit Pradhan** | Team Member |
| **Divyajyoti Sahu** | Team Member |
| **Gourav Samal** | Team Member |

**Project Guide:** Prof. Santosh Kumar Meher  
**Department:** Computer Science & Engineering  
**Program:** B.Tech — 3rd Year, 6th Semester (2025–26)  
**Institution:** Government College of Engineering, Keonjhar, Odisha

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).  
Free to use, fork, and adapt for any educational institution.

---

<div align="center">

Made with ❤️ at **GCE Keonjhar** — 2025–26

⭐ If this project helped you, please give it a star on GitHub!

</div>
