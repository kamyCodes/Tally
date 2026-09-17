const API = '/tasks';

const form = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const statusInput = document.getElementById('status');
const dueDateInput = document.getElementById('due_date');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const errorDiv = document.getElementById('error-msg');
const taskList = document.getElementById('task-list');

loadTasks();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const data = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    status: statusInput.value,
    due_date: dueDateInput.value || null
  };

  const editingId = taskIdInput.value;

  try {
    let res;
    if (editingId) {
      res = await fetch(`${API}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    const result = await res.json();

    if (!res.ok) {
      showError(result.error);
      return;
    }

    resetForm();
    loadTasks();
  } catch (err) {
    showError('Network error. Is the server running?');
  }
});

async function loadTasks() {
  try {
    const res = await fetch(API);
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    taskList.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span>Failed to load tasks. Is the server running?</div>';
  }
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span>No tasks yet — add one above to get started!</div>';
    return;
  }

  taskList.innerHTML = tasks.map(task => {
    // Card CSS class based on state
    let cardClass = 'task-card';
    if (task.status === 'done') {
      cardClass += ' done-card';
    } else if (task.overdue) {
      cardClass += ' overdue';
    } else if (task.due_in_days != null && task.due_in_days >= 0 && task.due_in_days <= 2) {
      cardClass += ' due-soon';
    }

    // Status badge
    const statusLabel = task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1);
    const badgeClass = task.status === 'in-progress' ? 'in-progress' : task.status;

    // Due date label
    let dueHtml = '';
    if (task.due_date) {
      if (task.status === 'done') {
        dueHtml = `<span class="due-label due-future">Due: ${task.due_date}</span>`;
      } else if (task.overdue) {
        const absDays = Math.abs(task.due_in_days || 0);
        dueHtml = `<span class="due-label due-overdue">⚠ Overdue by ${absDays} day${absDays !== 1 ? 's' : ''}</span>`;
      } else if (task.due_in_days === 0) {
        dueHtml = `<span class="due-label due-today">⏰ Due today</span>`;
      } else if (task.due_in_days != null && task.due_in_days <= 2 && task.due_in_days > 0) {
        dueHtml = `<span class="due-label due-today">Due in ${task.due_in_days} day${task.due_in_days !== 1 ? 's' : ''}</span>`;
      } else if (task.due_in_days != null && task.due_in_days > 2) {
        dueHtml = `<span class="due-label due-future">Due in ${task.due_in_days} days</span>`;
      } else {
        dueHtml = `<span class="due-label due-future">Due: ${task.due_date}</span>`;
      }
    }

    // Overdue badge (separate from status)
    const overdueBadge = task.overdue ? '<span class="badge badge-overdue">Overdue</span>' : '';

    return `
      <div class="${cardClass}">
        <div class="task-info">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="badge badge-${badgeClass}">${statusLabel}</span>
            ${overdueBadge}
            ${dueHtml}
          </div>
        </div>
        <div class="task-actions">
          ${task.status !== 'done' ? `<button class="btn-edit" onclick="editTask(${task.id})">Edit</button>` : ''}
          <button class="btn-delete" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

async function editTask(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Not found');
    const task = await res.json();

    taskIdInput.value = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description || '';
    statusInput.value = task.status;
    dueDateInput.value = task.due_date || '';

    submitBtn.innerHTML = '<span class="btn-icon">✓</span> Update Task';
    cancelBtn.classList.remove('hidden');
    titleInput.focus();
    hideError();
  } catch (err) {
    showError('Could not load task for editing');
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;

  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    loadTasks();
  } catch (err) {
    showError('Failed to delete task');
  }
}

function cancelEdit() {
  resetForm();
  hideError();
}

function resetForm() {
  form.reset();
  taskIdInput.value = '';
  submitBtn.innerHTML = '<span class="btn-icon">+</span> Add Task';
  cancelBtn.classList.add('hidden');
}

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  errorDiv.textContent = '';
  errorDiv.classList.add('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
