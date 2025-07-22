const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { Parser } = require('json2csv');


// Export students as CSV
router.get('/export/csv', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM students ORDER BY id');
    const students = result.rows;

    const fields = Object.keys(students[0] || {}); // Dynamically fetch column names
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(students);

    res.header('Content-Type', 'text/csv');
    res.attachment('students.csv');
    return res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to export CSV' });
  }
});

// ✅ GET all students (any authenticated user)
router.get('/', verifyToken, async (req, res) => {
  const { q } = req.query;

  try {
    let result;

    if (q) {
      const keyword = `%${q.toLowerCase()}%`;
      result = await db.query(
        `SELECT * FROM students
         WHERE LOWER(student_id) LIKE $1
         OR LOWER(name) LIKE $1
         OR LOWER(course) LIKE $1
         ORDER BY student_id`,
        [keyword]
      );
    } else {
      result = await db.query('SELECT * FROM students ORDER BY student_id');
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Search students error:', err.message);
    res.status(500).json({ error: 'Failed to search students.' });
  }
});


// ✅ POST a new student (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { student_id, name, email, phone, birth_date, gender, course } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO students 
       (student_id, name, email, phone, birth_date, gender, course)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [student_id, name, email, phone || null, birth_date || null, gender || null, course]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create student error:', err.message);
    res.status(500).json({ error: 'Failed to add student.' });
  }
});

// ✅ PATCH update (partial) – admin only
router.patch('/:student_id', verifyToken, requireAdmin, async (req, res) => {
  const student_id = req.params.student_id;
  const allowedFields = ['name', 'email', 'phone', 'birth_date', 'gender', 'course'];
  const updates = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      const value = req.body[field] === '' ? null : req.body[field];
      updates.push(`${field} = $${values.length + 1}`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  values.push(student_id); // Add student_id for WHERE clause

  const query = `
    UPDATE students
    SET ${updates.join(', ')}
    WHERE student_id = $${values.length}
    RETURNING *`;

  try {
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Student update error:', err.message);
    res.status(500).json({ error: 'Failed to update student. Server error.' });
  }
});

// ✅ DELETE student – admin only
router.delete('/:student_id', verifyToken, requireAdmin, async (req, res) => {
  const student_id = req.params.student_id;
  try {
    const result = await db.query(
      'DELETE FROM students WHERE student_id = $1 RETURNING *',
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    console.error('Delete student error:', err.message);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});


module.exports = router;