# Enterprise ERP Dynamic Authorization System (MERN)

A highly secure, enterprise-grade **User Management, Role Management, Dynamic Action Rights, and Data Scope Authorization Engine** built with Node.js, Express.js, MongoDB Atlas (Mongoose), React.js, Vite, and Redux Toolkit.

---

## 🌟 Core Architecture & Highlights

### 1. Dynamic Authorization Pipeline
$$\text{USER} \longrightarrow \text{ROLE} \longrightarrow \text{MODULE} \longrightarrow \text{ACTION} \longrightarrow \text{DATA SCOPE} \longrightarrow \text{MONGODB FILTER}$$

* **Action-Level Permissions**: Rights are assigned per specific action within each module (`view`, `create`, `edit`, `delete`, `export`, `import`, `assign`, `approve`, `reject`, `close`, `reopen`).
* **Action-Specific Data Scopes**: Data access scopes belong to the individual action, not globally to the module (`OWN`, `TEAM`, `DEPARTMENT`, `BRANCH`, `ALL`).
* **Direct Database Filtering**: Data scope filters are applied directly to MongoDB queries (`Model.find(req.dataScopeFilter)`), ensuring data is never fetched in full and filtered in React.

### 2. Dual JWT & HTTP-Only Cookie Authentication
* **Short-lived Access Token** (15 mins) carrying minimal payload (`{ userId }`) to prevent stale permission caches.
* **Long-lived Refresh Token** (7 days) stored securely in **HTTP-only, Secure, SameSite Cookie**, tracked in MongoDB for instant revocation upon logout or user deactivation.

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js (v18+)
* MongoDB Atlas Cluster (Connected via `MONGODB_URI`)

### Backend Setup
```bash
cd backend
npm install
npm run seed     # Idempotent DB Seeding (Modules, Roles, Accounts, Test Records)
npm run dev      # Starts Express API server on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite React App on http://localhost:5173
```

---

## 🔐 Default Test Accounts

| Account Role | Email | Password | Scope Level | Default Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@erp.com` | `Admin@123` | **ALL** | Full unrestricted access to all modules & administrative actions |
| **Sales Manager** | `manager@erp.com` | `Manager@123` | **DEPARTMENT / ALL** | Leads (`View: ALL`, `Edit: DEPARTMENT`, `Export: DEPARTMENT`, `Assign: ALL`) |
| **Sales Exec (HYD)** | `executive1@erp.com` | `Exec@123` | **OWN** | Leads (`View: OWN`, `Create: YES`, `Edit: OWN`, `Delete: NO`, `Export: NO`) |
| **Sales Exec (BLR)** | `executive2@erp.com` | `Exec@123` | **OWN** | Leads (`View: OWN`, `Create: YES`, `Edit: OWN`, `Delete: NO`, `Export: NO`) |

---

## 🛡️ Security Features
* **Helmet** HTTP header protection & **CORS** restrictions.
* **Express Rate Limiting** against login brute-force attacks (5 max attempts / 15 mins).
* **Express Mongo Sanitize** against NoSQL injection vulnerabilities.
* **Express Validator** payload schema sanitization.
* **Privilege Escalation Defense**: Backend forces server-side ownership context (`createdBy`, `departmentId`, `branchId`) and blocks unauthorized role escalation.
* **Audit Logging**: Comprehensive logging of security events, failed logins, role matrix changes, and user status toggles.
