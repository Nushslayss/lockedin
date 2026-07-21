# LOCKEDIN

A full-stack AI-powered Task Manager app — create, prioritize, chat with an AI assistant, and manage tasks with due dates, subtasks, and a soft-delete system. Built with **Next.js**, **Node.js**, **Express**, **MongoDB**, and **Groq AI**.

## Live Demo

- **Frontend:** https://lockedin-8080.up.railway.app
- **Backend API:** https://lockedinbackend.up.railway.app

## Tech Stack

**Frontend**
- Next.js (React framework, Pages Router)
- Custom pink/purple pastel theme with light & dark mode
- Google Fonts: Pacifico, Quicksand, Poppins

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JSON Web Tokens (JWT) for authentication
- Groq SDK (`llama-3.3-70b-versatile`) for AI features
- dotenv (environment variables)
- CORS (allows frontend on a different port to call this API)

## Features

- **Authentication** — signup and login with JWT-based auth
- **Task management** — create, edit, complete, mark not done, or delete tasks
- **Priority levels** — low / medium / high, auto-assigned by AI or set manually
- **Due dates** — set manually or let the AI decide based on priority
- **Subtasks** — break any task into smaller steps, editable and checkable individually
- **Soft delete** — deleted tasks move to a dedicated Deleted page where they can be rescheduled (restored) or permanently removed
- **AI chat assistant** — a full sidebar chat that:
  - Talks naturally about any topic, in any language
  - Creates tasks by asking for priority and due date conversationally (via clickable buttons or a date picker)
  - Deletes or completes tasks, showing a clickable list when the request is ambiguous
  - Splits a task into suggested subtasks, editable before you add them
  - Sends proactive reminders when a task's due date is coming up
- **Full-screen feedback** — sparkly celebration message on completing a task, supportive message + reschedule option when marking a task not done
- **Light/dark theme toggle** — pastel pink (light) / pastel purple (dark), persists across sessions

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create a new user, returns JWT |
| POST | `/api/auth/login` | Log in, returns JWT |

### Tasks (require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/grouped-by-day` | Tasks grouped: today / tomorrow / this week / later / no date |
| GET | `/api/tasks/by-priority` | Tasks grouped: high / medium / low |
| GET | `/api/tasks/deleted` | Get soft-deleted tasks |
| POST | `/api/tasks` | Create a task — AI assigns priority/subtasks if not provided |
| PATCH | `/api/tasks/:id` | Update any task field (title, priority, dueDate, status, subtasks, etc.) |
| DELETE | `/api/tasks/:id` | Permanently delete a task |

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send `{ message, history }`, get back a reply plus any task actions taken |

## Project Structure

```
lockedin/
├── frontend/
│   ├── pages/
│   │   ├── _app.js
│   │   ├── index.js       → main task board + AI chat sidebar
│   │   ├── login.js        → login page
│   │   ├── signup.js       → signup page
│   │   └── deleted.js       → deleted tasks — reschedule or permanently delete
│   └── styles/
│       └── globals.css       → theme variables, fonts, animations
├── backend/
│   ├── models/
│   │   ├── Task.js            → MongoDB schema (title, priority, dueDate, subtasks, status, tags)
│   │   └── User.js             → user schema
│   ├── routes/
│   │   ├── auth.js              → signup/login
│   │   ├── tasks.js              → task CRUD + grouped views + soft delete
│   │   └── chat.js                → AI assistant endpoint
│   ├── utils/
│   │   └── aiAgent.js              → Groq call for auto priority/subtask generation
│   ├── middleware.js                 → JWT auth middleware
│   └── server.js                      → entry point — connects DB, starts server
```

## Theme

CSS variables defined in `frontend/styles/globals.css`, swapped via `[data-theme="dark"]`:

| Variable | Light | Dark |
|----------|-------|------|
| `--bg` | `#fff3f8` | `#1b1025` |
| `--surface` | `#ffffff` | `#241733` |
| `--primary` | `#ff8fc7` | `#c9a4ff` |
| `--primary-strong` | `#ff5fae` | `#9b6ef5` |
| `--text` | `#4a1942` | `#f3e9ff` |

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
   JWT_SECRET=<your JWT secret>
   GROQ_API_KEY=<your Groq API key>
   ```

3. Run the server:
   ```bash
   node server.js
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

Runs at `http://localhost:3000`.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Log in |
| `/signup` | Create an account |
| `/` | Main task board + AI assistant (requires auth) |
| `/deleted` | View, reschedule, or permanently delete soft-deleted tasks |

> **Note:** the frontend and backend are deployed separately on Railway. Make sure the frontend's `API_URL` (set at the top of each page file) points to the deployed backend URL above (or `http://localhost:5000` for local development).
