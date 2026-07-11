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

Runs on **http://localhost:3000**

> Note: the backend server must also be running (see `portfolio-backend` repo) for tasks to load, since this app fetches data from `http://localhost:5000/api/tasks`.

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
