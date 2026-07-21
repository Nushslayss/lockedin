# LOCKEDIN — Backend

REST API for **LOCKEDIN**, an AI-powered Task Manager app. Built with **Node.js**, **Express**, and **MongoDB**, with an integrated Groq-powered AI assistant for task creation, prioritization, and conversation.

## Live Demo

- **Backend API:** https://lockedinbackend.up.railway.app

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JSON Web Tokens (JWT) for authentication
- Groq SDK (`llama-3.3-70b-versatile`) for AI features
- dotenv (environment variables)
- CORS (allows frontend on a different port to call this API)

## Features

- JWT-based authentication (signup/login)
- Full task CRUD (create, read, update, delete)
- AI auto-assigns priority and generates subtasks when a task is created without them
- Conversational AI chat endpoint — can create, delete, complete, or split tasks into subtasks based on natural language, in any language
- Tasks grouped by day (today/tomorrow/this week/later) or by priority (high/medium/low)
- Soft delete — deleted tasks move to a recoverable "deleted" status instead of being erased immediately

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

backend/
├── models/
│   ├── Task.js         → MongoDB schema (title, priority, dueDate, subtasks, status, tags)
│   └── User.js          → user schema
├── routes/
│   ├── auth.js            → signup/login
│   ├── tasks.js             → task CRUD + grouped views + soft delete
│   └── chat.js                → AI assistant endpoint
├── utils/
│   └── aiAgent.js               → Groq call for auto priority/subtask generation
├── middleware.js                  → JWT auth middleware
└── server.js                        → entry point — connects DB, starts server

Code
## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install

2. create a .env file with:
  PORT=5000
  MONGO_URI=<your MongoDB Atlas connection string>
  JWT_SECRET=<your JWT secret>
  GROQ_API_KEY=<your Groq API key>

  3. Run the server:
    node server.js

    Runs on http://localhost:5000 locally, or deployed on Railway.