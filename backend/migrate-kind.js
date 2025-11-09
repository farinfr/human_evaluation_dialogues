const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding kind column to dialogues table...');

db.serialize(() => {
  // Check if kind column exists
  db.all("PRAGMA table_info(dialogues)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      process.exit(1);
    }

    const hasKindColumn = columns.some(col => col.name === 'kind');

    if (!hasKindColumn) {
      console.log('Adding kind column to dialogues table...');
      db.run('ALTER TABLE dialogues ADD COLUMN kind INTEGER DEFAULT 1 CHECK(kind >= 1 AND kind <= 4)', (err) => {
        if (err) {
          console.error('Error adding column:', err);
          db.close();
          process.exit(1);
        }
        console.log('✓ Column added successfully!');
        
        // Update existing dialogues with kind values (round-robin 1-4)
        db.all('SELECT id FROM dialogues ORDER BY id', [], (err, rows) => {
          if (err) {
            console.error('Error getting dialogues:', err);
            db.close();
            process.exit(1);
          }
          
          const stmt = db.prepare('UPDATE dialogues SET kind = ? WHERE id = ?');
          rows.forEach((row, index) => {
            const kind = (index % 4) + 1;
            stmt.run(kind, row.id);
          });
          stmt.finalize();
          
          console.log(`✓ Updated ${rows.length} dialogues with kind values`);
          db.close();
        });
      });
    } else {
      console.log('✓ kind column already exists');
      db.close();
    }
  });
});

