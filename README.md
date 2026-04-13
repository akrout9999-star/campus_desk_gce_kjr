# CampusDesk — GCE Keonjhar
### Complete Setup Guide (Do this in order, step by step)

---

## STEP 1 — Install Node.js (if not installed)

Download from: https://nodejs.org  
Choose the **LTS** version. Install it normally.

To verify it worked, open terminal and run:
```
node -v
npm -v
```
Both should show version numbers.

---

## STEP 2 — Set Up Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `campus-desk` → Continue
3. Disable Google Analytics (not needed) → Create project

### Enable Authentication:
- Left sidebar → **Build → Authentication** → Get Started
- Click **Email/Password** → Enable it → Save

### Enable Firestore:
- Left sidebar → **Build → Firestore Database** → Create database
- Choose **Start in test mode** (we'll lock it down later)
- Select your region → Enable

### Get your config:
- Click the ⚙️ gear icon (top left) → Project settings
- Scroll down to **"Your apps"** → Click the **</>** (Web) icon
- Register app name as `campusdesk`
- Copy the `firebaseConfig` object — you'll need these values in Step 4

---

## STEP 3 — Put the project files

Copy the `campus-desk` folder to wherever you want on your computer (e.g., Desktop).

---

## STEP 4 — Create your .env file

Inside the `campus-desk` folder, create a new file called exactly `.env`  
(copy from `.env.example` and fill in your Firebase values):

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=campus-desk-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campus-desk-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=campus-desk-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## STEP 5 — Install dependencies

Open terminal, navigate to the campus-desk folder:
```
cd campus-desk
npm install
```
Wait for it to finish (may take 1-2 minutes).

---

## STEP 6 — Run the app

```
npm run dev
```

Open your browser at: **http://localhost:5173**

You should see the login page! ✅

---

## STEP 7 — Create your first Admin account manually

Because the app uses CSV import, you need to create the first admin account manually in Firebase.

1. Go to Firebase Console → Authentication → Users → **Add User**
2. Email: `admin@campusdesk.internal`
3. Password: (choose a strong password)
4. Copy the **UID** shown for this user

Now go to Firestore → Add document:
- Collection: `users`
- Document ID: (paste the UID)
- Fields:
  - `name` (string): `Admin`
  - `rollNo` (string): `ADMIN001`
  - `department` (string): `Administration`
  - `semester` (number): `1`
  - `role` (string): `admin`
  - `email` (string): `admin@campusdesk.internal`

Now log in at the app with roll number `ADMIN001` and your chosen password.

---

## STEP 8 — Import students via CSV

Once logged in as admin, go to **Import CSV**.

Your CSV file should look like this:
```
name,rollNo,department,semester,role,password
Ravi Kumar,2301CSE001,Computer Science & Engineering,3,student,Pass@1234
Priya Das,2301CSE002,Computer Science & Engineering,3,cr,Pass@5678
Dr. Mohan Singh,TCH001,Computer Science & Engineering,3,teacher,Teacher@123
```

- **role** must be: `student`, `cr`, `teacher`, or `admin`
- **password** must be at least 6 characters
- **department** must exactly match one of the 10 departments
- **semester** is 1–8

Upload the CSV and click Import.

---

## STEP 9 — Deploy to Vercel (free hosting)

1. Push your code to GitHub (create a repo, push)
2. Go to https://vercel.com → Sign up with GitHub
3. Click **"New Project"** → Import your repo
4. In Environment Variables, add all your `VITE_FIREBASE_*` values
5. Deploy → Done! You get a free URL like `campus-desk.vercel.app`

---

## Firestore Security Rules (set after testing)

Go to Firestore → Rules, paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    // Attendance: teachers/admins write, students read
    match /attendance/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }
    // Marks: teachers/admins write, students read
    match /marks/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }
    // Notes: cr/admins write, everyone reads
    match /notes/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['cr', 'admin'];
    }
  }
}
```

---

## File Structure Reference

```
campus-desk/
├── .env                    ← Your Firebase keys (never commit this!)
├── .env.example            ← Template for .env
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx            ← Entry point
    ├── App.jsx             ← All routes
    ├── firebase.js         ← Firebase init
    ├── index.css           ← All styles
    ├── assets/
    │   └── logo.svg        ← Replace with real logo
    ├── contexts/
    │   └── AuthContext.jsx ← Login/logout/user state
    ├── components/
    │   ├── AppShell.jsx    ← Layout with sidebar
    │   ├── Sidebar.jsx     ← Navigation sidebar
    │   ├── Logo.jsx        ← Logo component
    │   ├── Spinner.jsx     ← Loading indicator
    │   └── ProtectedRoute.jsx
    ├── pages/
    │   ├── Login.jsx
    │   ├── student/        ← Dashboard, Attendance, Marks, Notes
    │   ├── cr/             ← Same as student + Upload Notes
    │   ├── teacher/        ← Dashboard, Take Attendance, Enter Marks
    │   └── admin/          ← Dashboard, Import CSV, Users list
    └── utils/
        └── roles.js        ← Roles, departments, semesters
```

---

## Replacing the Logo

1. Get your GCE Keonjhar logo file (PNG or SVG)
2. Rename it to `logo.svg` (or `logo.png`)
3. Replace `src/assets/logo.svg` with your file
4. Also replace `public/logo.svg` (used as browser tab icon)
5. If using PNG, update `src/components/Logo.jsx` line 1:
   ```js
   import logoUrl from '../assets/logo.png'
   ```

---

## Support

Any issues? Check:
- Firebase Console → Authentication (are users created?)
- Browser Console (F12) for errors
- Make sure `.env` file has correct values with no spaces

. 
