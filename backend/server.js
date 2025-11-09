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
    is_admin INTEGER DEFAULT 0,
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
    realism INTEGER CHECK(realism >= 1 AND realism <= 5),
    conciseness INTEGER CHECK(conciseness >= 1 AND conciseness <= 5),
    coherence INTEGER CHECK(coherence >= 1 AND coherence <= 5),
    overall_naturalness INTEGER CHECK(overall_naturalness >= 1 AND overall_naturalness <= 5),
    utterance_realism INTEGER CHECK(utterance_realism >= 1 AND utterance_realism <= 5),
    script_following INTEGER CHECK(script_following >= 1 AND script_following <= 5),
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

// Middleware to verify admin access
const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
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
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 0)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email, is_admin: 0 },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          token,
          user: { id: this.lastID, username, email, is_admin: 0 }
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

      // Ensure is_admin is properly set (handle both 0/1 and true/false)
      const isAdmin = user.is_admin === 1 || user.is_admin === true ? 1 : 0;

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, is_admin: isAdmin },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, is_admin: isAdmin }
      });
    }
  );
});

// Dialogue Routes
app.get('/api/dialogue/random', authenticateToken, (req, res) => {
  // First, get all dialogues the user hasn't rated yet
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
        // User has rated all dialogues - return empty
        return res.json({ 
          message: 'You have rated all available dialogues',
          dialogue: null,
          all_rated: true
        });
      }

      // Return the unrated dialogue
      try {
        const dialogue = JSON.parse(rows[0].dialogue_data);
        res.json({ 
          ...dialogue, 
          db_id: rows[0].id, 
          dialogue_id: rows[0].dialogue_id,
          all_rated: false
        });
      } catch (parseErr) {
        console.error('Error parsing dialogue data:', parseErr);
        return res.status(500).json({ error: 'Error parsing dialogue data' });
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
  const { dialogue_id, realism, conciseness, coherence, overall_naturalness, utterance_realism, script_following } = req.body;

  if (!dialogue_id) {
    return res.status(400).json({ error: 'Dialogue ID is required' });
  }

  // Validate ratings are between 1 and 5
  const ratings = { realism, conciseness, coherence, overall_naturalness, utterance_realism, script_following };
  for (const [key, value] of Object.entries(ratings)) {
    if (value !== undefined && (value < 1 || value > 5)) {
      return res.status(400).json({ error: `${key} must be between 1 and 5` });
    }
  }

  db.run(
    `INSERT OR REPLACE INTO ratings 
     (user_id, dialogue_id, realism, conciseness, coherence, overall_naturalness, utterance_realism, script_following)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, dialogue_id, realism, conciseness, coherence, overall_naturalness, utterance_realism, script_following],
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
          realism: row.realism,
          conciseness: row.conciseness,
          coherence: row.coherence,
          overall_naturalness: row.overall_naturalness,
          utterance_realism: row.utterance_realism,
          script_following: row.script_following
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
          realism: row.realism,
          conciseness: row.conciseness,
          coherence: row.coherence,
          overall_naturalness: row.overall_naturalness,
          utterance_realism: row.utterance_realism,
          script_following: row.script_following
        },
        created_at: row.created_at
      });
    }
  );
});

// Admin Routes
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  const stats = {};
  
  // Get total users
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.totalUsers = row.count;
    
    // Get total ratings
    db.get('SELECT COUNT(*) as count FROM ratings', [], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.totalRatings = row.count;
      
      // Get total dialogues
      db.get('SELECT COUNT(*) as count FROM dialogues', [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.totalDialogues = row.count;
        
        // Get average ratings per metric
        db.all(`
          SELECT 
            AVG(realism) as avg_realism,
            AVG(conciseness) as avg_conciseness,
            AVG(coherence) as avg_coherence,
            AVG(overall_naturalness) as avg_overall_naturalness,
            AVG(utterance_realism) as avg_utterance_realism,
            AVG(script_following) as avg_script_following
          FROM ratings
          WHERE realism IS NOT NULL
        `, [], (err, rows) => {
          if (err) {
            console.error('Error getting average ratings:', err);
            stats.averageRatings = {
              realism: 0, conciseness: 0, coherence: 0,
              overall_naturalness: 0, utterance_realism: 0, script_following: 0
            };
            stats.ratingsByDate = [];
            return res.json(stats);
          }
          
          if (rows.length > 0 && rows[0].avg_realism !== null) {
            stats.averageRatings = {
              realism: parseFloat(rows[0].avg_realism || 0).toFixed(2),
              conciseness: parseFloat(rows[0].avg_conciseness || 0).toFixed(2),
              coherence: parseFloat(rows[0].avg_coherence || 0).toFixed(2),
              overall_naturalness: parseFloat(rows[0].avg_overall_naturalness || 0).toFixed(2),
              utterance_realism: parseFloat(rows[0].avg_utterance_realism || 0).toFixed(2),
              script_following: parseFloat(rows[0].avg_script_following || 0).toFixed(2)
            };
          } else {
            stats.averageRatings = {
              realism: 0, conciseness: 0, coherence: 0,
              overall_naturalness: 0, utterance_realism: 0, script_following: 0
            };
          }
          
          // Get ratings by date
          db.all(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM ratings
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
          `, [], (err, dateRows) => {
            if (err) {
              console.error('Error getting ratings by date:', err);
              stats.ratingsByDate = [];
            } else {
              stats.ratingsByDate = dateRows || [];
            }
            
            res.json(stats);
          });
        });
      });
    });
  });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  db.all(`
    SELECT 
      u.id, u.username, u.email, u.is_admin, u.created_at,
      COUNT(r.id) as rating_count
    FROM users u
    LEFT JOIN ratings r ON u.id = r.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Error getting users:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    res.json(rows || []);
  });
});

app.get('/api/admin/ratings', authenticateAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all(`
    SELECT 
      r.*,
      u.username,
      d.product_title,
      d.dialogue_data
    FROM ratings r
    JOIN users u ON r.user_id = u.id
    JOIN dialogues d ON r.dialogue_id = d.dialogue_id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset], (err, rows) => {
    if (err) {
      console.error('Error getting ratings:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (!rows || rows.length === 0) {
      return res.json([]);
    }
    
    const ratings = rows.map(row => {
      try {
        return {
          id: row.id,
          user_id: row.user_id,
          username: row.username,
          dialogue_id: row.dialogue_id,
          product_title: row.product_title,
          ratings: {
            realism: row.realism,
            conciseness: row.conciseness,
            coherence: row.coherence,
            overall_naturalness: row.overall_naturalness,
            utterance_realism: row.utterance_realism,
            script_following: row.script_following
          },
          created_at: row.created_at,
          dialogue: row.dialogue_data ? JSON.parse(row.dialogue_data) : null
        };
      } catch (parseErr) {
        console.error('Error parsing dialogue data:', parseErr);
        return {
          id: row.id,
          user_id: row.user_id,
          username: row.username,
          dialogue_id: row.dialogue_id,
          product_title: row.product_title,
          ratings: {
            realism: row.realism,
            conciseness: row.conciseness,
            coherence: row.coherence,
            overall_naturalness: row.overall_naturalness,
            utterance_realism: row.utterance_realism,
            script_following: row.script_following
          },
          created_at: row.created_at,
          dialogue: null
        };
      }
    });
    
    res.json(ratings);
  });
});

app.get('/api/admin/dialogues', authenticateAdmin, (req, res) => {
  db.all(`
    SELECT 
      d.*,
      COUNT(r.id) as rating_count,
      AVG(r.realism) as avg_realism,
      AVG(r.conciseness) as avg_conciseness,
      AVG(r.coherence) as avg_coherence,
      AVG(r.overall_naturalness) as avg_overall_naturalness,
      AVG(r.utterance_realism) as avg_utterance_realism,
      AVG(r.script_following) as avg_script_following
    FROM dialogues d
    LEFT JOIN ratings r ON d.dialogue_id = r.dialogue_id
    GROUP BY d.id
    ORDER BY rating_count DESC, d.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Error getting dialogues:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (!rows || rows.length === 0) {
      return res.json([]);
    }
    
    const dialogues = rows.map(row => {
      try {
        return {
          id: row.id,
          dialogue_id: row.dialogue_id,
          product_id: row.product_id,
          product_title: row.product_title,
          rating_count: row.rating_count || 0,
          average_ratings: {
            realism: row.avg_realism ? parseFloat(row.avg_realism).toFixed(2) : null,
            conciseness: row.avg_conciseness ? parseFloat(row.avg_conciseness).toFixed(2) : null,
            coherence: row.avg_coherence ? parseFloat(row.avg_coherence).toFixed(2) : null,
            overall_naturalness: row.avg_overall_naturalness ? parseFloat(row.avg_overall_naturalness).toFixed(2) : null,
            utterance_realism: row.avg_utterance_realism ? parseFloat(row.avg_utterance_realism).toFixed(2) : null,
            script_following: row.avg_script_following ? parseFloat(row.avg_script_following).toFixed(2) : null
          },
          dialogue: row.dialogue_data ? JSON.parse(row.dialogue_data) : null,
          created_at: row.created_at
        };
      } catch (parseErr) {
        console.error('Error parsing dialogue data:', parseErr);
        return {
          id: row.id,
          dialogue_id: row.dialogue_id,
          product_id: row.product_id,
          product_title: row.product_title,
          rating_count: row.rating_count || 0,
          average_ratings: {
            realism: null, conciseness: null, coherence: null,
            overall_naturalness: null, utterance_realism: null, script_following: null
          },
          dialogue: null,
          created_at: row.created_at
        };
      }
    });
    
    res.json(dialogues);
  });
});

// Initialize dialogues on startup
populateDialogues();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

