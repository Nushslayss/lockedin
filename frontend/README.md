---

**`frontend/README.md`**

```markdown
# LOCKEDIN — Frontend

Frontend for **LOCKEDIN**, an AI-powered Task Manager with a pastel pink/purple glam theme and a built-in conversational AI sidebar. Built with **Next.js**.

## Live Demo

- **Frontend:** https://lockedin-8080.up.railway.app

## Tech Stack

- Next.js (React framework, Pages Router)
- Custom theming via CSS variables (no UI library)
- Google Fonts: Pacifico (wordmark), Quicksand (UI/labels), Poppins (body)

## Features

- Login & signup pages with a pill-style switcher between the two
- Light/dark mode — pastel pink (light) / pastel purple (dark), toggle persists via `localStorage`
- Animated glittery "lockedin" wordmark with shimmer gradient and twinkling sparkles
- Task board:
  - Quick-add with optional priority and due date (AI decides if left blank)
  - Editable priority and due date directly on each task row
  - Expandable subtask panel — add, edit, check off, or delete subtasks
  - Done / Not done / Delete actions per task
  - Full-screen sparkly celebration message on completing a task
  - Full-screen supportive message + reschedule flow when marking a task "not done"
- Deleted tasks page — restore (reschedule) or permanently delete soft-deleted tasks
- Always-visible AI chat sidebar:
  - Conversational, multilingual, general-knowledge capable
  - Asks for priority/due date via clickable buttons or a date picker when creating a task
  - Shows a clickable task list when a delete/complete request is ambiguous
  - Proposes editable subtask suggestions you can tweak before adding

## Project Structure
frontend/
├── pages/
│   ├── _app.js
│   ├── index.js        → main task board + AI chat sidebar
│   ├── login.js          → login page
│   ├── signup.js         → signup page
│   └── deleted.js         → deleted tasks — restore or permanently delete
└── styles/
└── globals.css         → theme variables, fonts, animations


## Theme

CSS variables defined in `globals.css`, swapped via `[data-theme="dark"]`:

| Variable | Light | Dark |
|----------|-------|------|
| `--bg` | `#fff3f8` | `#1b1025` |
| `--surface` | `#ffffff` | `#241733` |
| `--primary` | `#ff8fc7` | `#c9a4ff` |
| `--primary-strong` | `#ff5fae` | `#9b6ef5` |
| `--text` | `#4a1942` | `#f3e9ff` |

## Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install

2. run the dev server
    ```bash
   npm run dev

Runs at http://localhost:3000.

Note: update API_URL at the top of each page file if your backend URL changes — currently points to the deployed Railway backend.
Pages

Route              Description
/login             Log in
/signup            Create an account
/                  Main task board + AI assistant (requires auth)
/deleted           View, reschedule, or permanently delete soft-deleted tasks
   