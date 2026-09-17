const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const taskRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/tasks', taskRoutes);

// Initialize the database, then start listening
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Task Manager running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
