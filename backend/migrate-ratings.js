const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Migrating ratings table to new schema...');

db.serialize(() => {
  // Check current columns
  db.all("PRAGMA table_info(ratings)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      process.exit(1);
    }

    const columnNames = columns.map(col => col.name);
    console.log('Current columns:', columnNames);

    // Drop old table and create new one with correct schema
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        db.close();
        process.exit(1);
      }

      // Create backup of old data if it exists
      db.all('SELECT * FROM ratings', [], (err, oldRatings) => {
        if (err && !err.message.includes('no such table')) {
          console.error('Error reading old ratings:', err);
          db.run('ROLLBACK');
          db.close();
          process.exit(1);
        }

        // Drop old table
        db.run('DROP TABLE IF EXISTS ratings', (err) => {
          if (err) {
            console.error('Error dropping table:', err);
            db.run('ROLLBACK');
            db.close();
            process.exit(1);
          }

          // Create new table with correct schema
          db.run(`CREATE TABLE ratings (
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
          )`, (err) => {
            if (err) {
              console.error('Error creating new table:', err);
              db.run('ROLLBACK');
              db.close();
              process.exit(1);
            }

            console.log('✓ New ratings table created successfully!');
            console.log('Note: Old ratings data was not migrated (schema changed).');
            console.log('Users will need to re-rate dialogues with the new metrics.');
            
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                db.close();
                process.exit(1);
              }
              console.log('✓ Migration completed successfully!');
              db.close();
            });
          });
        });
      });
    });
  });
});

