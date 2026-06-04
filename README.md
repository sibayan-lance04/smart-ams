# Smart Asset Management System
### Full Stack: React + Node.js/Express + MySQL (XAMPP)

---

## DEFAULT LOGIN
| Username | Password |
|----------|----------|
| admin    | admin123 |

---

## QUICK SETUP (3 steps)

### Step 1 — Database (XAMPP)
1. Open XAMPP → Start **Apache** and **MySQL**
2. Go to `http://localhost/phpmyadmin`
3. Click **Import** → choose `database.sql` → click **Go**

### Step 2 — Backend
```bash
cd backend
npm install
# Edit .env if needed (default XAMPP settings work out of the box)
node server.js
# Server runs on http://localhost:5000
```

### Step 3 — Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```
Open `http://localhost:5173` in your browser and log in.

---

## FOLDER STRUCTURE
```
smart-ams/
├── database.sql              ← Import this into phpMyAdmin
├── backend/
│   ├── server.js             ← Express entry point
│   ├── .env                  ← DB config (edit if needed)
│   ├── config/db.js          ← MySQL pool + helpers
│   ├── middleware/auth.js    ← Session auth guard
│   └── routes/
│       ├── auth.js           ← Login / Logout / Me
│       ├── assets.js         ← Full CRUD for assets
│       ├── users.js          ← Users + profile + account delete
│       ├── departments.js    ← Department CRUD
│       ├── maintenance.js    ← Maintenance scheduling
│       └── general.js        ← Dashboard / Activity Log / Monitoring / Reports
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx           ← Routes
        ├── api.js            ← Axios instance
        ├── index.css         ← All styles
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Layout.jsx    ← Sidebar + topbar
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Assets.jsx        ← Full CRUD, depreciation calc, insurance
            ├── Users.jsx         ← View users, create new
            ├── Departments.jsx   ← Full CRUD
            ├── Maintenance.jsx   ← Schedule, edit, delete
            ├── Monitoring.jsx    ← Depreciation alerts, warranty, maintenance due
            ├── Reports.jsx       ← 6 report types + CSV export + print
            ├── ActivityLog.jsx   ← Full audit trail with filters
            └── Profile.jsx       ← Edit profile, change password, delete account
```

---

## API ENDPOINTS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET  | /api/auth/me | Current user |
| GET  | /api/assets | List all assets |
| POST | /api/assets | Create asset |
| PUT  | /api/assets/:id | Update asset |
| DELETE | /api/assets/:id | Delete asset (Disposed only) |
| GET  | /api/users | List users |
| POST | /api/users | Create user |
| PUT  | /api/users/profile | Update own profile |
| DELETE | /api/users/account | Delete own account |
| GET  | /api/departments | List departments |
| POST | /api/departments | Create department |
| PUT  | /api/departments/:id | Update department |
| DELETE | /api/departments/:id | Delete department |
| GET  | /api/maintenance | List maintenance |
| POST | /api/maintenance | Schedule maintenance |
| PUT  | /api/maintenance/:id | Update maintenance |
| DELETE | /api/maintenance/:id | Delete maintenance |
| GET  | /api/dashboard | Dashboard stats |
| GET  | /api/activity-log | Full audit log |
| GET  | /api/monitoring | Monitoring dashboard data |
| GET  | /api/reports/:type | Generate reports |

---

## .env (backend)
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=         ← leave blank for XAMPP default
DB_NAME=asset_management
SESSION_SECRET=change_this_in_production
FRONTEND_URL=http://localhost:5173
```
