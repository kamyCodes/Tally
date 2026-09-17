const express = require('express');
const { getDb, saveDb } = require('./db');

const router = express.Router();

const VALID_STATUSES = ['pending', 'in-progress', 'done'];

// Helper: run a query and return all rows as plain objects
function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query and return a single row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Compute overdue and due-in-n-days for a task object
function enrichTask(task) {
  if (!task || !task.due_date || task.status === 'done') {
    task.overdue = false;
    task.due_in_days = null;
    return task;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  task.due_in_days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  task.overdue = task.due_in_days < 0;
  return task;
}

// GET /tasks — list all tasks
router.get('/', (req, res) => {
  try {
    const tasks = queryAll('SELECT * FROM tasks ORDER BY created_date DESC');
    res.json(tasks.map(enrichTask));
  } catch (err) {
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /tasks/:id — get a single task
router.get('/:id', (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [Number(req.params.id)]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(enrichTask(task));
  } catch (err) {
    console.error('Error fetching task:', err.message);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /tasks — create a new task
router.post('/', (req, res) => {
  const { title, description, status, due_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  if (due_date && isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: 'Invalid due_date. Use a valid date format (YYYY-MM-DD)' });
  }

  try {
    const db = getDb();
    db.run(
      'INSERT INTO tasks (title, description, status, due_date) VALUES (?, ?, ?, ?)',
      [title.trim(), description || '', status || 'pending', due_date || null]
    );
    saveDb();

    // Get the inserted row — use MAX(id) since sql.js resets last_insert_rowid across exec calls
    const newTask = queryOne('SELECT * FROM tasks WHERE id = (SELECT MAX(id) FROM tasks)');
    res.status(201).json(enrichTask(newTask));
  } catch (err) {
    console.error('Error creating task:', err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /tasks/:id — update a task
router.put('/:id', (req, res) => {
  const { title, description, status, due_date } = req.body;
  const id = Number(req.params.id);

  try {
    const existing = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Can't mark done before the due date
    const effectiveStatus = status !== undefined ? status : existing.status;
    const effectiveDue = due_date !== undefined ? (due_date || null) : existing.due_date;
    if (effectiveStatus === 'done' && effectiveDue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(effectiveDue + 'T00:00:00');
      if (due > today) {
        return res.status(400).json({ error: `Cannot mark done — due date is ${effectiveDue} (future). Complete it on or after that date.` });
      }
    }

    if (due_date !== undefined && due_date !== null && due_date !== '' && isNaN(Date.parse(due_date))) {
      return res.status(400).json({ error: 'Invalid due_date. Use a valid date format (YYYY-MM-DD)' });
    }

    const db = getDb();
    db.run(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, due_date = ?
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : existing.title,
        description !== undefined ? description : existing.description,
        status !== undefined ? status : existing.status,
        due_date !== undefined ? (due_date || null) : existing.due_date,
        id
      ]
    );
    saveDb();

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(enrichTask(updated));
  } catch (err) {
    console.error('Error updating task:', err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /tasks/:id — delete a task
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const db = getDb();
    db.run('DELETE FROM tasks WHERE id = ?', [id]);
    saveDb();

    res.json({ message: 'Task deleted', task });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
