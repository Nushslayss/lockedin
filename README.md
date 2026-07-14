# LOCKEDIN

A full-stack Task Manager app for creating, tracking, and managing tasks — built with **Next.js**, **Tailwind CSS**, **Node.js**, **Express**, and **MongoDB**.

## Live Demo

- **Frontend:** https://lockedin-8080.up.railway.app/login
- **Backend API:** https://lockedinbackend.up.railway.app/

## Tech Stack

**Frontend**
- Next.js (React framework)
- Tailwind CSS

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- dotenv (environment variables)
- CORS (allows frontend on a different port to call this API)

## Features

- View all tasks
- Add a new task (title + optional description)
- Mark a task as complete / undo
- Delete a task

## API Endpoints

| Method | Endpoint         | Description                     |
|--------|-------------------|----------------------------------|
| GET    | /api/tasks        | Get all tasks                   |
| POST   | /api/tasks        | Create a new task                |
| PATCH  | /api/tasks/:id    | Update a task (e.g. mark complete) |
| DELETE | /api/tasks/:id    | Delete a task                   |

## Project Structure

```
task-manager/
├── frontend/
│   ├── pages/
│   │   ├── _app.js      → wraps all pages, loads global styles
│   │   └── index.js     → main page (task list, form, API calls)
│   └── styles/
│       └── globals.css  → Tailwind imports
│
└── backend/
    ├── models/
    │   └── Task.js       → MongoDB schema (shape of a task)
    ├── routes/
    │   └── tasks.js       → API route handlers (CRUD logic)
    └── server.js          → entry point — connects DB, starts server
```

## Setup

### Backend

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file with:
   ```
   PORT=5000
   MONGO_URI=<your MongoDB Atlas connection string>
   ```

3. Run the server:
   ```bash
   npm run dev
   ```

### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

> **Note:** the frontend and backend are deployed separately on Railway. Make sure the frontend's API base URL points to the deployed backend URL above (or `http://localhost:5000` for local development).
