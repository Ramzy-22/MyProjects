const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ✅ Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students'); // 👈 you missed this

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes); // 👈 this is what was missing

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
