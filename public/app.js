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

// Load all tasks on page load
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
      // Update existing task
      res = await fetch(`${API}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // Create new task
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
    taskList.innerHTML = '<div class="empty-state">Failed to load tasks. Is the server running?</div>';
  }
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state">No tasks yet. Add one above!</div>';
    return;
  }

  taskList.innerHTML = tasks.map(task => `
    <div class="task-card">
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="status-badge status-${task.status}">${task.status}</span>
          ${task.due_date ? `<span>Due: ${task.due_date}</span>` : ''}
          <span>Created: ${formatDate(task.created_date)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-edit" onclick="editTask(${task.id})">Edit</button>
        <button class="btn-delete" onclick="deleteTask(${task.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

async function editTask(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Not found');
    const task = await res.json();

    // Fill the form with the task's data
    taskIdInput.value = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description || '';
    statusInput.value = task.status;
    dueDateInput.value = task.due_date || '';

    submitBtn.textContent = 'Update Task';
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
  submitBtn.textContent = 'Add Task';
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
