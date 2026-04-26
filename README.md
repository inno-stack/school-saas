<div align="center">

<br />

<img src="https://img.shields.io/badge/InnoCore-School%20Management%20SaaS-1a3c5e?style=for-the-badge&logoColor=white" alt="InnoCore" />

<br />
<br />

# InnoCore — School Management SaaS Platform

### A production-grade, multi-tenant school management system built with modern full-stack technologies

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

<br />

[**Live Demo**](https://InnoCore-demo.vercel.app) · [**API Docs**](#-api-reference) · [**Report Bug**](https://github.com/inno-stack/InnoCore/issues) · [**Request Feature**](https://github.com/inno-stack/InnoCore/issues)

<br />

</div>

---

## 🧭 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Security Implementation](#-security-implementation)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Project Structure](#-project-structure)
- [Engineering Highlights](#-engineering-highlights)
- [Performance & Scalability](#-performance--scalability)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## Overview

**InnoCore** is a fully production-ready, multi-tenant SaaS platform that digitizes the entire academic workflow of a school — from student enrollment and class management to automated result processing, scratch card-based secure access, and branded PDF generation.

Built with a strong emphasis on **security**, **data isolation**, **developer experience**, and **real-world scalability**, InnoCore serves as both a commercial-grade school management product and a reference implementation of enterprise multi-tenant SaaS architecture in the Next.js ecosystem.

> **What makes this project different:** Every design decision — from the database schema to the API surface — was made with production in mind. Row-level tenant isolation, atomic transactions, JWT rotation, soft deletes, position ranking algorithms, and a complete PDF pipeline are all implemented from scratch without relying on third-party SaaS tools.

```
┌─────────────────────────────────────────────────────────────────┐
│                        InnoCore Platform                         │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Greenfield     │   All Saints'    │     Any School            │
│   Academy        │   Seminary       │     (Tenant N)            │
│   (Tenant 1)     │   (Tenant 2)     │                           │
│                  │                  │                           │
│  ├─ Admin        │  ├─ Admin        │  ├─ Admin                 │
│  ├─ Teachers     │  ├─ Teachers     │  ├─ Teachers              │
│  ├─ Students     │  ├─ Students     │  ├─ Students              │
│  ├─ Parents      │  ├─ Parents      │  ├─ Parents               │
│  └─ Results      │  └─ Results      │  └─ Results               │
└──────────────────┴──────────────────┴───────────────────────────┘
         All schools share ONE deployment. Zero data leakage.
```

---

## Key Features

### 🔐 Authentication & Authorization

- **JWT-based auth** with 15-minute access tokens and 7-day refresh tokens
- **Token rotation** — every refresh invalidates the old token and issues a new one
- **HttpOnly cookies** for refresh token storage (XSS-proof)
- **4-tier RBAC** — `SUPER_ADMIN` → `SCHOOL_ADMIN` → `TEACHER` → `PARENT`
- **Token revocation** — logout deletes tokens from the database instantly
- **User enumeration prevention** — identical error messages for wrong email/password

### Multi-Tenant Architecture

- Every database record is scoped by `schoolId` — complete tenant isolation
- Unique **slug system** per school for identity management
- Atomic transactions for all cross-table operations
- School-level activation/deactivation with cascade token revocation

### Complete Academic Workflow

- **Student enrollment** with auto-generated registration numbers (`GRE/2026/001`)
- **Class & subject management** with duplicate prevention per school
- **Academic session & term system** with single-active-at-a-time enforcement
- **Result engine** — CA + Exam scoring, auto-grade, auto-remarks
- **Class position ranking** with correct tie-handling algorithm
- **Per-subject position tracking** with class averages

### Intelligent Result Engine

```
Input: CA Score (max 40) + Exam Score (max 60)
         │
         ▼
   Total = CA + Exam
         │
         ▼
┌─────────────────────────────────────────┐
│  Score Range  │  Grade │  Remark        │
├───────────────┼────────┼────────────────┤
│  70 – 100     │   A    │  Excellent     │
│  60 – 69      │   B    │  Very Good     │
│  50 – 59      │   C    │  Good          │
│  45 – 49      │   P    │  Fair          │
│  0  – 44      │   F    │  Poor          │
└─────────────────────────────────────────┘
         │
         ▼
   Auto-rank all students in class
   Handle ties: two 85% → both get 1st
   Update per-subject positions + class averages
```

### Scratch Card System

- **4 uses per card** across all 3 terms in one academic session
- **Session-locked** — 2025/2026 cards cannot access 2026/2027 results
- Re-checking any term costs one use (configurable)
- Cards become `EXHAUSTED` after all 4 uses are consumed
- Admin can `DISABLE` unused cards at any time
- Full usage audit trail per card

### 📄 PDF Result Generation

- Fully branded, single-page A4 result sheets
- School name, motto, address embedded in document
- Complete subject table with CA, Exam, Total, Grade, Remark, Position, Class Average
- Psychomotor skills + Social behaviour ratings section
- Teacher and principal comments with signature lines
- School stamp placeholder + official result badge
- Generated server-side with `@react-pdf/renderer`

### Parent Portal

- Many-to-many parent-student relationships (father + mother can both have accounts)
- Parents only see published results for their own linked children
- Full result sheet view + PDF download from parent account
- Admin-controlled link/unlink operations

### Super Admin Panel

- System-wide analytics across all schools on the platform
- Top schools by student count, result volume, card usage rate
- Grade distribution across the entire platform
- One-click school enable/disable (force-logs out all school users atomically)
- Cross-school user search with role filtering

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│   Next.js App Router · React Query · Zustand · shadcn/ui    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                      Proxy Layer (src/proxy.ts)              │
│         JWT verification + RBAC on every /api/* request     │
│         Injects x-user-* headers for downstream handlers    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      API Layer (40+ Routes)                  │
│   Zod Validation · requireAuth() guards · Tenant isolation  │
│   Transaction-safe ops · Standardized JSON responses        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Service Utilities                        │
│  grade-engine · position-calculator · card-generator        │
│  reg-number · active-period · jwt · password · api-client   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Database Layer                            │
│        Prisma 7 ORM · PostgreSQL 16 · @prisma/adapter-pg    │
│        13 models · Strategic indexes · Cascade deletes      │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Implementation

InnoCore uses a **shared database, isolated data** pattern. All tenants share the same PostgreSQL instance, but every query is automatically scoped by `schoolId`:

```typescript
// Pattern applied to EVERY protected query in the system
const students = await prisma.student.findMany({
  where: {
    schoolId: auth.schoolId, // ← Enforced at query level, not just middleware
    status: "ACTIVE",
  },
});
// Cross-tenant access is architecturally impossible for non-SUPER_ADMIN roles
```

---

## Tech Stack

### Backend

| Technology              | Version | Purpose                                                        |
| ----------------------- | ------- | -------------------------------------------------------------- |
| **Next.js**             | 16.2    | Full-stack framework, App Router, API Routes, Proxy middleware |
| **TypeScript**          | 5.x     | End-to-end type safety across all 40+ route handlers           |
| **Prisma**              | 7.x     | Type-safe ORM, schema-first migrations, query builder          |
| **PostgreSQL**          | 16      | Primary relational database                                    |
| **@prisma/adapter-pg**  | latest  | Native PostgreSQL driver (Prisma 7 requirement)                |
| **jsonwebtoken**        | 9.x     | JWT access + refresh token generation and verification         |
| **bcryptjs**            | 2.x     | Password hashing with configurable salt rounds                 |
| **Zod**                 | 3.x     | Runtime validation schemas with TypeScript inference           |
| **@react-pdf/renderer** | 4.x     | Server-side A4 PDF generation with React components            |

### Frontend

| Technology                | Version | Purpose                                                 |
| ------------------------- | ------- | ------------------------------------------------------- |
| **React**                 | 19      | UI component framework                                  |
| **Tailwind CSS**          | 3.x     | Utility-first styling system                            |
| **shadcn/ui**             | latest  | Accessible, composable component library                |
| **@tanstack/react-query** | 5.x     | Server state management, caching, background refetching |
| **Zustand**               | 5.x     | Lightweight client state with localStorage persistence  |
| **React Hook Form**       | 7.x     | Performant form handling with minimal re-renders        |
| **Axios**                 | 1.x     | HTTP client with request/response interceptors          |
| **Sonner**                | latest  | Non-blocking toast notifications                        |
| **Lucide React**          | latest  | Consistent icon system                                  |

---

## 🔒 Security Implementation

InnoCore implements multiple layers of security following OWASP best practices:

### Authentication Security

```typescript
// 1. Passwords hashed with bcrypt (12 rounds ≈ 400ms intentional delay)
const hash = await bcrypt.hash(password, 12);

// 2. Access tokens expire in 15 minutes — short window limits exposure
const accessToken = jwt.sign(payload, secret, { expiresIn: "15m" });

// 3. Refresh tokens stored in DB — can be revoked server-side at any time
await prisma.token.create({ data: { token, userId, expiresAt } });

// 4. HttpOnly cookie — invisible to JavaScript (XSS-proof)
response.cookies.set("refreshToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60,
});

// 5. Token rotation — old refresh token deleted atomically on every use
await prisma.$transaction([
  prisma.token.delete({ where: { token: oldToken } }),
  prisma.token.create({ data: { token: newToken, userId, expiresAt } }),
]);
```

### Vulnerability Mitigations

| Vulnerability                | Mitigation                                                             |
| ---------------------------- | ---------------------------------------------------------------------- |
| **SQL Injection**            | Prisma ORM with parameterized queries — raw SQL never used             |
| **IDOR**                     | `schoolId` enforced on every single DB query                           |
| **User Enumeration**         | Identical `"Invalid email or password"` for all auth failures          |
| **XSS**                      | HttpOnly cookies, no sensitive data in localStorage                    |
| **CSRF**                     | SameSite cookie policy + Authorization header pattern                  |
| **Brute Force**              | bcrypt intentional slowness (rate limiting integration-ready)          |
| **Mass Assignment**          | Zod schemas explicitly whitelist all accepted input fields             |
| **Privilege Escalation**     | Role guards enforced at proxy layer AND individual route level         |
| **Data Leakage**             | Prisma `select` on every query — passwords never returned in responses |
| **Broken Object Level Auth** | Every resource lookup includes `schoolId: auth.schoolId`               |

### Security Headers (Production)

```typescript
// Applied to all routes via next.config.ts
"X-Frame-Options":           "DENY",
"X-Content-Type-Options":    "nosniff",
"Referrer-Policy":           "strict-origin-when-cross-origin",
"Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
```

---

## 🗄️ Database Schema

InnoCore's schema is designed for **referential integrity**, **query performance**, and **tenant isolation**:

```
School (Tenant Root)
│
├── Users (SCHOOL_ADMIN | TEACHER | PARENT)
│   └── Tokens (Refresh token store with expiry)
│
├── Students
│   ├── CardUsages (Scratch card usage audit trail)
│   └── Results (one per student per term)
│       ├── ResultItems (one per subject — CA, Exam, Grade, Position)
│       └── ResultSkills (Psychomotor + Social behaviour ratings)
│
├── Classes
│   └── Subjects (many per class, scoped to school)
│
├── Sessions (e.g. 2025/2026)
│   └── Terms (FIRST | SECOND | THIRD)
│
├── ScratchCards (session-locked, 4-use tracking)
│   └── CardUsages (per-use audit: who, when, which term)
│
└── ParentStudents (many-to-many join table)
```

### Key Design Decisions

**1. Soft Deletes — Data Is Never Lost**

```prisma
model User    { isActive Boolean       @default(true)   }
model Student { status   StudentStatus @default(ACTIVE) }
// INACTIVE | GRADUATED | TRANSFERRED | SUSPENDED
```

**2. Composite Unique Constraints — Business Rules in the Schema**

```prisma
@@unique([name, schoolId])       // Class names unique per school
@@unique([studentId, termId])    // One result per student per term
@@unique([name, sessionId])      // No duplicate terms in same session
@@unique([parentId, studentId])  // No duplicate parent-child links
@@unique([pin])                  // Every scratch card PIN is globally unique
```

**3. Cascade Deletes — Clean Data Lifecycle**

```prisma
school School @relation(onDelete: Cascade)
// Deleting a school removes ALL its data atomically
```

**4. Strategic Indexing — Query Performance at Scale**

```prisma
@@index([schoolId])              // Tenant isolation — on EVERY model
@@index([classId, termId])       // Composite for result queries
@@index([isPublished])           // Fast published result filtering
@@index([schoolId, status])      // Composite student status filtering
@@index([totalScore])            // Fast position ranking sorts
@@index([status])                // Scratch card status filtering
```

---

## 📡 API Reference

### Base URL

```
Development:  http://localhost:3000/api
Production:   https://yourdomain.com/api
```

### Standard Response Format

```json
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}

// Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fieldErrors": { "email": ["Invalid email address"] },
    "formErrors": []
  }
}
```

### Authentication

| Method | Endpoint         | Description                            | Auth   |
| ------ | ---------------- | -------------------------------------- | ------ |
| `POST` | `/auth/register` | Register school + create admin account | Public |
| `POST` | `/auth/login`    | Login, receive access + refresh tokens | Public |
| `POST` | `/auth/refresh`  | Rotate tokens using HttpOnly cookie    | Cookie |
| `POST` | `/auth/logout`   | Revoke refresh token from DB           | Cookie |

### School Management

| Method    | Endpoint            | Description                                  | Role  |
| --------- | ------------------- | -------------------------------------------- | ----- |
| `GET/PUT` | `/school/profile`   | View / update school details                 | Admin |
| `GET/PUT` | `/school/settings`  | View / update system preferences             | Admin |
| `GET`     | `/school/dashboard` | Stats overview (students, teachers, results) | Admin |

### User Management

| Method           | Endpoint              | Description                        | Role  |
| ---------------- | --------------------- | ---------------------------------- | ----- |
| `GET`            | `/users/teachers`     | List teachers (paginated + search) | Admin |
| `POST`           | `/users/teachers`     | Create teacher account             | Admin |
| `GET/PUT/DELETE` | `/users/teachers/:id` | Profile / update / deactivate      | Admin |
| `GET`            | `/users/parents`      | List parents (paginated + search)  | Admin |
| `POST`           | `/users/parents`      | Create parent account              | Admin |
| `GET/PUT/DELETE` | `/users/parents/:id`  | Profile / update / deactivate      | Admin |

### Student Management

| Method           | Endpoint        | Description                                       | Role           |
| ---------------- | --------------- | ------------------------------------------------- | -------------- |
| `GET`            | `/students`     | List (page, search, gender, status filters)       | Admin, Teacher |
| `POST`           | `/students`     | Enroll — auto-generates `GRE/2026/001` reg number | Admin          |
| `GET/PUT/DELETE` | `/students/:id` | Profile / update / deactivate                     | Admin          |

### Academic Structure

| Method           | Endpoint                            | Description                                          | Role  |
| ---------------- | ----------------------------------- | ---------------------------------------------------- | ----- |
| `GET/POST`       | `/classes`                          | List / create classes                                | Admin |
| `GET/PUT/DELETE` | `/classes/:id`                      | Manage class + view subjects                         | Admin |
| `GET/POST`       | `/classes/:id/subjects`             | List / add subjects to class                         | Admin |
| `PUT/DELETE`     | `/classes/:id/subjects/:sid`        | Update / remove subject                              | Admin |
| `GET/POST`       | `/sessions`                         | List / create academic sessions                      | Admin |
| `POST`           | `/sessions/:id/activate`            | Set active session (atomic — deactivates all others) | Admin |
| `GET/POST`       | `/sessions/:id/terms`               | List / add terms                                     | Admin |
| `POST`           | `/sessions/:id/terms/:tid/activate` | Set active term (atomic)                             | Admin |

### Result Engine

| Method | Endpoint                            | Description                                    | Role           |
| ------ | ----------------------------------- | ---------------------------------------------- | -------------- |
| `POST` | `/results/scores`                   | Bulk score input with auto-calculation         | Admin, Teacher |
| `POST` | `/results/skills`                   | Psychomotor + social behaviour ratings         | Admin, Teacher |
| `PUT`  | `/results/attendance`               | Attendance and vacation dates                  | Admin          |
| `PUT`  | `/results/comments`                 | Teacher + principal comments                   | Admin          |
| `GET`  | `/results/:studentId/:termId`       | Full formatted result sheet                    | Admin, Teacher |
| `GET`  | `/results/class?classId=x`          | Class rankings with positions                  | Admin, Teacher |
| `POST` | `/results/publish`                  | Publish/unpublish (per student or whole class) | Admin          |
| `GET`  | `/results/pdf?studentId=x&termId=y` | Download branded A4 PDF                        | Admin, Teacher |

### Scratch Cards

| Method   | Endpoint                  | Description                                           | Role   |
| -------- | ------------------------- | ----------------------------------------------------- | ------ |
| `GET`    | `/scratch-cards`          | List cards (status filter + pagination + summary)     | Admin  |
| `POST`   | `/scratch-cards`          | Generate batch (max 500)                              | Admin  |
| `POST`   | `/scratch-cards/validate` | **Public** — validate PIN, consume use, return result | Public |
| `POST`   | `/scratch-cards/disable`  | Bulk disable unused cards                             | Admin  |
| `DELETE` | `/scratch-cards/:id`      | Delete unused card                                    | Admin  |

### Parent Portal

| Method   | Endpoint                                | Description                                 | Role          |
| -------- | --------------------------------------- | ------------------------------------------- | ------------- |
| `POST`   | `/parent/link-child`                    | Link parent to student                      | Admin         |
| `DELETE` | `/parent/unlink-child/:id`              | Remove link                                 | Admin         |
| `GET`    | `/parent/children`                      | Parent's linked children with latest result | Parent, Admin |
| `GET`    | `/parent/children/:id`                  | Child profile with all linked parents       | Parent, Admin |
| `GET`    | `/parent/children/:id/results`          | All published results across terms          | Parent, Admin |
| `GET`    | `/parent/children/:id/results/:tid`     | Single term full result sheet               | Parent, Admin |
| `GET`    | `/parent/children/:id/results/:tid/pdf` | Download PDF result                         | Parent, Admin |

### Super Admin

| Method    | Endpoint                    | Description                                     | Role        |
| --------- | --------------------------- | ----------------------------------------------- | ----------- |
| `GET`     | `/admin/dashboard`          | System-wide analytics across all schools        | Super Admin |
| `GET`     | `/admin/schools`            | All schools (search, status filter, pagination) | Super Admin |
| `GET/PUT` | `/admin/schools/:id`        | Deep school profile / edit                      | Super Admin |
| `POST`    | `/admin/schools/:id/toggle` | Enable/disable school + revoke all tokens       | Super Admin |
| `GET`     | `/admin/users`              | All users cross-school (role, school filter)    | Super Admin |
| `GET`     | `/admin/stats`              | Platform analytics + grade distribution         | Super Admin |

### Query Parameters

```
?page=1         → Pagination (default: 1)
?limit=20       → Items per page (default: 20, max: 100)
?search=john    → Full-text search (name, email, reg number)
?gender=MALE    → Filter students by gender
?status=ACTIVE  → Filter by status
?role=TEACHER   → Filter users by role (Super Admin)
?schoolId=xxx   → Filter by school (Super Admin)
```

---

## 🔄 Authentication Flow

```
┌──────────┐          ┌────────────┐          ┌──────────────┐
│  Client  │          │  API Route  │          │  PostgreSQL  │
└────┬─────┘          └─────┬──────┘          └──────┬───────┘
     │                      │                        │
     │   POST /auth/login   │                        │
     │─────────────────────>│                        │
     │                      │  SELECT user + verify  │
     │                      │───────────────────────>│
     │                      │<───────────────────────│
     │                      │  INSERT refresh token  │
     │                      │───────────────────────>│
     │  accessToken (body)  │                        │
     │  refreshToken    │                        │
     │<─────────────────────│                        │
     │                      │                        │
     │  [15 min later...]   │                        │
     │  401 from any route  │                        │
     │                      │                        │
     │  POST /auth/refresh  │                        │
     │  Cookie auto-sent  │                        │
     │─────────────────────>│                        │
     │                      │  DELETE old token      │
     │                      │  INSERT new token      │
     │                      │───────────────────────>│
     │  new accessToken     │                        │
     │  new refreshToken  │                        │
     │<─────────────────────│                        │
     │                      │                        │
     │  Retry original req  │                        │
     │─────────────────────>│                        │
```

The Axios interceptor handles this entire flow **transparently** — API consumers never see a 401:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { data } = await axios.post("/api/auth/refresh");
      useAuthStore.getState().setToken(data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original); // Transparently retry
    }
  },
);
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 16+
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/inno-stack/school-saas.git
cd InnoCore
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
```

### 4. Set Up Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE InnoCore_db;"

# Run all migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 5. Seed Super Admin Account

```bash
node prisma/create-super-admin.mjs
```

```
✅ Super admin created successfully!
   Email:    superadmin@InnoCore.com
   Password: SuperAdmin@123
   Role:     SUPER_ADMIN
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirected to login.

**Test credentials:**

```
Super Admin:  superadmin@InnoCore.com  / SuperAdmin@123
School Admin: Register a school first via /register
```

### 7. Register Your First School

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "schoolName":     "Greenfield Academy",
  "schoolEmail":    "info@greenfield.edu.ng",
  "schoolAddress":  "12 School Road, Lagos",
  "adminFirstName": "John",
  "adminLastName":  "Doe",
  "adminEmail":     "john@greenfield.edu.ng",
  "password":       "SecurePass1"
}
```

---

## Environment Setup

### Development `.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/InnoCore_dev"
ACCESS_TOKEN_SECRET="dev-access-secret-at-least-32-characters-long"
REFRESH_TOKEN_SECRET="dev-refresh-secret-at-least-32-characters-long"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Production `.env`

```env
# Use connection pooling for production
DATABASE_URL="postgresql://user:pass@host:5432/InnoCore?sslmode=require&connection_limit=10"

# Generate strong secrets: openssl rand -base64 64
ACCESS_TOKEN_SECRET="<64-char-random-string>"
REFRESH_TOKEN_SECRET="<64-char-random-string-different-from-above>"

ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

---

## 📁 Project Structure

```
InnoCore/
├── prisma/
│   ├── schema.prisma                  # 13-model schema with full relations
│   ├── migrations/                    # Full migration history
│   └── create-super-admin.mjs         # Seed script
│
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Auth pages — no dashboard layout
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (dashboard)/               # Protected — hydration-safe auth guard
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Overview + stats + quick actions
│   │   │       ├── students/          # List + enroll + profile
│   │   │       ├── teachers/          # List + add
│   │   │       ├── parents/           # List + add + link to student
│   │   │       ├── classes/           # Class arms + subjects (nested)
│   │   │       ├── sessions/          # Sessions + terms + activation
│   │   │       ├── results/           # Score entry + rankings + PDF
│   │   │       ├── scratch-cards/     # Generate + manage + usage tracking
│   │   │       └── settings/          # School profile + system preferences
│   │   │
│   │   ├── api/
│   │   │   ├── auth/                  # register, login, refresh, logout
│   │   │   ├── school/                # profile, settings, dashboard
│   │   │   ├── users/                 # teachers/[id], parents/[id]
│   │   │   ├── students/              # CRUD + pagination + search
│   │   │   ├── classes/               # CRUD + subjects (deeply nested)
│   │   │   ├── sessions/              # CRUD + terms + atomic activation
│   │   │   ├── results/               # scores, skills, attendance, pdf, publish
│   │   │   ├── scratch-cards/         # generate, validate (public), disable
│   │   │   ├── parent/                # children, results, PDF, link/unlink
│   │   │   └── admin/                 # dashboard, schools, users, stats
│   │   │
│   │   ├── not-found.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Redirects → /dashboard
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            # Role-filtered navigation
│   │   │   └── Header.tsx             # Page title + search
│   │   ├── pdf/
│   │   │   └── ResultSheet.tsx        # Full branded A4 PDF component
│   │   └── ui/                        # shadcn/ui + custom StatCard
│   │
│   ├── lib/
│   │   ├── prisma.ts                  # Singleton client (hot-reload safe)
│   │   ├── jwt.ts                     # Token generation + verification
│   │   ├── password.ts                # bcrypt utilities
│   │   ├── response.ts                # Standardized API response helpers
│   │   ├── auth-guard.ts              # requireAuth() with token fallback
│   │   ├── grade-engine.ts            # Grade calc + ordinal + performance
│   │   ├── position-calculator.ts     # Class + subject ranking (tie-safe)
│   │   ├── reg-number.ts              # Auto reg number with school prefix
│   │   ├── active-period.ts           # Active session/term resolver
│   │   ├── card-generator.ts          # Unique PIN + serial generation
│   │   └── api-client.ts              # Axios + silent token refresh
│   │
│   ├── store/
│   │   └── auth.store.ts              # Zustand + localStorage persistence
│   │
│   ├── hooks/
│   │   └── useRequireAuth.ts          # Hydration-safe route protection
│   │
│   ├── providers/
│   │   └── QueryProvider.tsx          # React Query configuration
│   │
│   ├── validators/                    # Zod schema per entity
│   │   ├── auth.validator.ts
│   │   ├── school.validator.ts
│   │   ├── user.validator.ts
│   │   ├── student.validator.ts
│   │   ├── class.validator.ts
│   │   ├── session.validator.ts
│   │   ├── result.validator.ts
│   │   └── scratch-card.validator.ts
│   │
│   └── proxy.ts                       # Next.js 16 route proxy (auth middleware)
│
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Engineering Highlights

### 1. Position Algorithm with Correct Tie-Handling

```typescript
// Standard approach gives WRONG results for ties:
// Position: 1, 2, 2, 4 ← INCORRECT (skips 3)
// InnoCore uses competition ranking:
// Position: 1, 1, 3, 4 ← CORRECT

let currentPosition = 1;
const updates = results.map((result, index) => {
  if (index > 0 && result.average < results[index - 1].average) {
    currentPosition = index + 1; // Skip positions equal to tied count
  }
  return prisma.result.update({
    where: { id: result.id },
    data: { position: currentPosition, outOf },
  });
});
await prisma.$transaction(updates); // All-or-nothing update
```

### 2. Scratch Card Session Locking

```typescript
// Cards are generated tied to the ACTIVE session at creation time
// They cannot be used to access a different session's results
if (card.sessionId !== session.id) {
  return errorResponse(
    `This card is for the ${card.session.name} session and cannot ` +
      `be used to check ${session.name} results. Please get a new card.`,
    403,
  );
}
```

### 3. Atomic School Disable — Force Logout All Users

```typescript
// Disabling a school in a single atomic transaction:
// 1. Marks school as inactive
// 2. Deletes ALL refresh tokens for ALL school users
// Net effect: every user is silently logged out on next request
await prisma.$transaction(async (tx) => {
  await tx.school.update({ where: { id }, data: { isActive: false } });

  const userIds = (
    await tx.user.findMany({
      where: { schoolId: id },
      select: { id: true },
    })
  ).map((u) => u.id);

  await tx.token.deleteMany({ where: { userId: { in: userIds } } });
});
```

### 4. Auto Token Refresh on 401

```typescript
// Every failed request with 401 triggers a transparent token refresh
// The original request is then retried with the new token
// The user never sees an authentication error
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { data } = await axios.post(
        "/api/auth/refresh",
        {},
        {
          withCredentials: true, // Sends the HttpOnly cookie
        },
      );
      useAuthStore.getState().setToken(data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original); // Silently retry original request
    }
  },
);
```

### 5. Hydration-Safe Auth Guard

```typescript
// Problem: Zustand reads from localStorage (async on mount)
// Naive check: isAuth = false on first render → redirect to /login
// Solution: Wait for hydration before evaluating auth state

export default function DashboardLayout({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const { isAuth } = useAuthStore();

  useEffect(() => setHydrated(true), []);  // Fires after rehydration

  useEffect(() => {
    if (hydrated && !isAuth) router.replace("/login");
  }, [hydrated, isAuth]);

  if (!hydrated) return <LoadingSpinner />;  // Never flash-redirect
  if (!isAuth)   return null;

  return <DashboardUI />;
}
```

---

## ⚡ Performance & Scalability

### Database Query Optimization

```typescript
// BAD — Sequential queries (sum of all query times)
const teachers = await prisma.user.count({ where: { role: "TEACHER" } });
const parents = await prisma.user.count({ where: { role: "PARENT" } });
const students = await prisma.student.count();
const results = await prisma.result.count({ where: { isPublished: true } });

// GOOD — Parallel queries (time = slowest single query)
const [teachers, parents, students, results] = await Promise.all([
  prisma.user.count({ where: { role: "TEACHER" } }),
  prisma.user.count({ where: { role: "PARENT" } }),
  prisma.student.count(),
  prisma.result.count({ where: { isPublished: true } }),
]);
```

### Frontend Caching Strategy

```typescript
// React Query provides:
// ✅ Automatic background refetching
// ✅ Stale-while-revalidate pattern
// ✅ Deduplication of identical requests
// ✅ Optimistic updates for mutations

const { data } = useQuery({
  queryKey: ["students", page, search, gender], // Granular cache keys
  queryFn: () => api.get(`/students?page=${page}&search=${search}`),
  staleTime: 60 * 1000, // Data fresh for 1 minute
});
```

### Current Scale Capacity

```
Architecture supports:
├── Unlimited schools (horizontal tenant scaling)
├── Pagination on all list endpoints (20 default, 100 max)
├── Stateless JWT (API servers scale independently)
├── Connection pooling ready (connection_limit in DATABASE_URL)
└── Selective Prisma select — zero over-fetching

Planned scale improvements:
├── Redis caching for hot data (active session/term, school settings)
├── Background job queue for bulk PDF generation
├── Read replicas for Super Admin analytics queries
└── CDN integration for school logo/photo uploads
```

---

## Roadmap

```
✅ v1.0 — Core Platform (COMPLETE)
   ├─ Multi-tenant authentication with JWT rotation
   ├─ School, user, student, class management
   ├─ Session & term system with atomic activation
   ├─ Result engine with auto-grading and rankings
   ├─ Scratch card system (4-use, session-locked)
   ├─ Branded PDF generation
   ├─ Parent portal with child linking
   ├─ Super admin panel with platform analytics
   └─ Full React dashboard (8+ pages)

🔧 v1.1 — Enhanced Features
   ├─ Student photo uploads (Cloudinary)
   ├─ School logo uploads
   ├─ Bulk student import from CSV
   ├─ Bulk result export to Excel
   └─ Email notifications (Resend)

🚀 v1.2 — Communication Layer
   ├─ In-app notification system
   ├─ SMS alerts for parents
   ├─ School announcement board
   └─ Parent-teacher messaging thread

📊 v2.0 — Analytics & Intelligence
   ├─ Student performance trend charts
   ├─ Class and subject performance comparison
   ├─ Custom grading scales per school
   └─ AI-generated result remarks

💳 v2.1 — Monetization
   ├─ Subscription tiers (Basic / Pro / Enterprise)
   ├─ Stripe payment integration
   ├─ Usage-based billing per active student
   └─ School onboarding flow with guided setup
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

```bash
# 1. Fork and clone
git clone https://github.com/yourusername/InnoCore.git

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes

# 4. Check TypeScript
npx tsc --noEmit

# 5. Commit with Conventional Commits format
git commit -m "feat(results): add bulk CSV score import"

# 6. Push and open a Pull Request
git push origin feature/your-feature-name
```

### Commit Convention

```
feat:      New feature
fix:       Bug fix
docs:      Documentation changes
refactor:  Code improvement (no behavior change)
security:  Security hardening
perf:      Performance improvement
test:      Adding or updating tests
chore:     Tooling or build changes
```

### Good First Contributions

- 🧪 **Tests** — Unit tests for `grade-engine`, `position-calculator`, auth utilities
- 📱 **Mobile UI** — Responsive improvements for smaller screens
- 📊 **Charts** — Recharts integration for dashboard analytics
- 🌍 **i18n** — Multi-language support
- 📖 **OpenAPI** — Swagger/OpenAPI documentation generation

---

## 👨‍💻 Author

<div align="center">

**Built with dedication and a commitment to production-quality engineering.**

[![GitHub](https://img.shields.io/badge/GitHub-yourusername-181717?style=flat-square&logo=github)](https://github.com/yourusername)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Your%20Name-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/yourname)
[![Portfolio](https://img.shields.io/badge/Portfolio-yoursite.dev-22c55e?style=flat-square)](https://yoursite.dev)

</div>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- [Next.js](https://nextjs.org) — The React framework that made full-stack TypeScript seamless
- [Prisma](https://prisma.io) — Type-safe ORM that made the database layer a pleasure
- [shadcn/ui](https://ui.shadcn.com) — Beautiful, accessible component primitives
- [TanStack Query](https://tanstack.com/query) — Transformed server state management
- [Zod](https://zod.dev) — Runtime validation that enforces correctness at the boundary

---

<div align="center">

** If InnoCore helped you learn or gave you inspiration, please star the repository!**

_Built with Next.js · TypeScript · Prisma · PostgreSQL · Tailwind CSS_

</div>
