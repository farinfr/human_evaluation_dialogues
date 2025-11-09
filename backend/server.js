const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Initialize database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Dialogues table
  db.run(`CREATE TABLE IF NOT EXISTS dialogues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dialogue_id TEXT UNIQUE NOT NULL,
    product_id INTEGER,
    product_title TEXT,
    dialogue_data TEXT NOT NULL,
    source_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ratings table
  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dialogue_id TEXT NOT NULL,
    reality INTEGER CHECK(reality >= 1 AND reality <= 5),
    user_friendly INTEGER CHECK(user_friendly >= 1 AND user_friendly <= 5),
    helpfulness INTEGER CHECK(helpfulness >= 1 AND helpfulness <= 5),
    naturalness INTEGER CHECK(naturalness >= 1 AND naturalness <= 5),
    overall INTEGER CHECK(overall >= 1 AND overall <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, dialogue_id)
  )`);
});

// Load dialogues from JSON files
function loadDialogues() {
  const dialoguesDir = path.join(__dirname, '..', 'llm_generated_dialogues');
  const dialogues = [];
  
  try {
    const files = fs.readdirSync(dialoguesDir);
    files.forEach(file => {
      if (file.endsWith('.json') && file !== 'llm_generated_dialogues.json') {
        const filePath = path.join(dialoguesDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        dialogues.push(data);
      }
    });
  } catch (error) {
    console.error('Error loading dialogues:', error);
  }
  
  return dialogues;
}

// Populate dialogues in database
function populateDialogues() {
  const dialogues = loadDialogues();
  const stmt = db.prepare(`INSERT OR IGNORE INTO dialogues (dialogue_id, product_id, product_title, dialogue_data, source_file) 
    VALUES (?, ?, ?, ?, ?)`);
  
  dialogues.forEach(dialogue => {
    // Use consistent dialogue_id based on product_id
    const dialogueId = `dialogue_${dialogue.product_id}`;
    stmt.run(
      dialogueId,
      dialogue.product_id,
      dialogue.product_title,
      JSON.stringify(dialogue),
      'llm_generated_dialogues'
    );
  });
  
  stmt.finalize();
  console.log(`Loaded ${dialogues.length} dialogues into database`);
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    }
  );
});

// Dialogue Routes
app.get('/api/dialogue/random', authenticateToken, (req, res) => {
  db.all(
    `SELECT d.* FROM dialogues d 
     LEFT JOIN ratings r ON d.dialogue_id = r.dialogue_id AND r.user_id = ?
     WHERE r.id IS NULL
     ORDER BY RANDOM()
     LIMIT 1`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (rows.length === 0) {
        // If user has rated all dialogues, return a random one anyway
        db.all(
          'SELECT * FROM dialogues ORDER BY RANDOM() LIMIT 1',
          [],
          (err, allRows) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (allRows.length === 0) {
              return res.status(404).json({ error: 'No dialogues available' });
            }
            const dialogue = JSON.parse(allRows[0].dialogue_data);
            res.json({ ...dialogue, db_id: allRows[0].id, dialogue_id: allRows[0].dialogue_id });
          }
        );
      } else {
        const dialogue = JSON.parse(rows[0].dialogue_data);
        res.json({ ...dialogue, db_id: rows[0].id, dialogue_id: rows[0].dialogue_id });
      }
    }
  );
});

app.get('/api/dialogue/:dialogueId', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM dialogues WHERE dialogue_id = ?',
    [req.params.dialogueId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Dialogue not found' });
      }

      const dialogue = JSON.parse(row.dialogue_data);
      res.json({ ...dialogue, db_id: row.id, dialogue_id: row.dialogue_id });
    }
  );
});

// Rating Routes
app.post('/api/rating', authenticateToken, (req, res) => {
  const { dialogue_id, reality, user_friendly, helpfulness, naturalness, overall } = req.body;

  if (!dialogue_id) {
    return res.status(400).json({ error: 'Dialogue ID is required' });
  }

  // Validate ratings are between 1 and 5
  const ratings = { reality, user_friendly, helpfulness, naturalness, overall };
  for (const [key, value] of Object.entries(ratings)) {
    if (value !== undefined && (value < 1 || value > 5)) {
      return res.status(400).json({ error: `${key} must be between 1 and 5` });
    }
  }

  db.run(
    `INSERT OR REPLACE INTO ratings 
     (user_id, dialogue_id, reality, user_friendly, helpfulness, naturalness, overall)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, dialogue_id, reality, user_friendly, helpfulness, naturalness, overall],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error saving rating' });
      }

      res.json({
        message: 'Rating saved successfully',
        rating_id: this.lastID
      });
    }
  );
});

app.get('/api/ratings/history', authenticateToken, (req, res) => {
  db.all(
    `SELECT r.*, d.product_title, d.dialogue_data
     FROM ratings r
     JOIN dialogues d ON r.dialogue_id = d.dialogue_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const ratings = rows.map(row => ({
        id: row.id,
        dialogue_id: row.dialogue_id,
        product_title: row.product_title,
        ratings: {
          reality: row.reality,
          user_friendly: row.user_friendly,
          helpfulness: row.helpfulness,
          naturalness: row.naturalness,
          overall: row.overall
        },
        created_at: row.created_at,
        dialogue: JSON.parse(row.dialogue_data)
      }));

      res.json(ratings);
    }
  );
});

app.get('/api/ratings/:dialogueId', authenticateToken, (req, res) => {
  db.get(
    `SELECT * FROM ratings 
     WHERE user_id = ? AND dialogue_id = ?`,
    [req.user.id, req.params.dialogueId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Rating not found' });
      }

      res.json({
        dialogue_id: row.dialogue_id,
        ratings: {
          reality: row.reality,
          user_friendly: row.user_friendly,
          helpfulness: row.helpfulness,
          naturalness: row.naturalness,
          overall: row.overall
        },
        created_at: row.created_at
      });
    }
  );
});

// Initialize dialogues on startup
populateDialogues();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

