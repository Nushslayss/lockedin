# Task Manager — Backend

REST API for a full-stack Task Manager app, built with **Node.js**, **Express**, and **MongoDB**.

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- dotenv (environment variables)
- CORS (allows frontend on a different port to call this API)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (already included) with:
```
PORT=5000
MONGO_URI=<your MongoDB Atlas connection string, set in Railway env vars>
replace "MONGO_URI" with your mongoDB Atlas connection string if not running MongoDB locally.

3. Run the server:
```bash
npm run dev
```

Runs on **railway**: https://task-manager-production-d03d.up.railway.app/

## API Endpoints

| Method | Endpoint           | Description           |
|--------|--------------------|------------------------|
| GET    | /api/tasks         | Get all tasks          |
| POST   | /api/tasks         | Create a new task       |
| PATCH  | /api/tasks/:id     | Update a task (e.g. mark complete) |
| DELETE | /api/tasks/:id     | Delete a task           |

## Folder Structure
```
models/
  Task.js      → MongoDB schema (shape of a task)
routes/
  tasks.js     → API route handlers (CRUD logic)
server.js      → entry point — connects DB, starts server
```
