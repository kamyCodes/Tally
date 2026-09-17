# Task Manager

A simple task management application with a Node.js/Express backend, SQLite database, and a plain HTML/CSS/JS frontend.

## Install Dependencies

```bash
cd task-manager
npm install
```

## Run the App

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## Configuration

| Variable  | Default | Description          |
|-----------|---------|----------------------|
| `PORT`    | `3000`  | Server listen port   |

Set via environment variable, e.g. `PORT=8080 npm start`.

## API Endpoints

| Method   | Endpoint        | Description        |
|----------|-----------------|--------------------|
| `GET`    | `/tasks`        | List all tasks     |
| `GET`    | `/tasks/:id`    | Get a single task  |
| `POST`   | `/tasks`        | Create a task      |
| `PUT`    | `/tasks/:id`    | Update a task      |
| `DELETE` | `/tasks/:id`    | Delete a task      |

### Request/Response Examples

**Create task:**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "description": "Milk, eggs, bread", "due_date": "2026-09-20"}'
```

**Update task status:**
```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

## Assumptions & Decisions

- **SQLite library:** Using `sql.js` (WASM-compiled SQLite) instead of `better-sqlite3` because it requires no native build tools (no Visual Studio / Xcode / gcc needed). This makes `npm install` work out of the box on any platform.
- **Persistence:** The in-memory database is saved to `tasks.db` on disk after every write (INSERT, UPDATE, DELETE). This keeps things simple — no WAL or journal complexity.
- **Status values:** Limited to `pending`, `in-progress`, and `done` (enforced at both the DB and API level).
- **Date format:** Due dates use ISO format (`YYYY-MM-DD`). The `created_date` is auto-set by SQLite.
- **Partial updates:** `PUT` only updates fields that are included in the request body — omitted fields keep their existing values.
- **No auth:** This is a personal/local tool; there's no authentication or multi-user support.
- **Database file:** SQLite creates `tasks.db` in the project root. Add it to `.gitignore` if committing.
- **Validation errors** return HTTP 400 with a clear JSON message. Not-found returns 404. Server errors return 500.
