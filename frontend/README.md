# Task Manager — Frontend

Frontend for a full-stack Task Manager app, built with **Next.js** and **Tailwind CSS**.

## Tech Stack
- Next.js (React framework)
- Tailwind CSS

## Setup

```bash
npm install
npm run dev
```

Runs on **Railway**: https://focused-generosity-production-8080.up.railway.app

> Note: backend is deployed separately on Railway at https://task-manager-production-d03d.up.railway.app
## Features
- View all tasks
- Add a new task (title + optional description)
- Mark a task as complete / undo
- Delete a task

## Folder Structure
```
pages/
  _app.js     → wraps all pages, loads global styles
  index.js    → main page (task list, form, API calls)
styles/
  globals.css → Tailwind imports
```
