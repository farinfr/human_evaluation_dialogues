const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Migrating database to add admin support...');

db.serialize(() => {
  // Check if is_admin column exists
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      process.exit(1);
    }

    const hasAdminColumn = columns.some(col => col.name === 'is_admin');

    if (!hasAdminColumn) {
      console.log('Adding is_admin column to users table...');
      db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0', (err) => {
        if (err) {
          console.error('Error adding column:', err);
          db.close();
          process.exit(1);
        }
        console.log('✓ Column added successfully!');
        createAdminUser();
      });
    } else {
      console.log('✓ is_admin column already exists');
      createAdminUser();
    }
  });
});

function createAdminUser() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'admin123';

  console.log(`\nCreating admin user: ${username} (${email})`);

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      db.close();
      process.exit(1);
    }

    // First try to update existing user
    db.run(
      'UPDATE users SET password = ?, is_admin = 1 WHERE username = ? OR email = ?',
      [hashedPassword, username, email],
      function(updateErr) {
        if (updateErr) {
          console.error('Error updating user:', updateErr);
          db.close();
          process.exit(1);
        }

        if (this.changes > 0) {
          console.log('✓ Admin user updated successfully!');
          console.log(`Username: ${username}`);
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          db.close();
        } else {
          // User doesn't exist, create new one
          db.run(
            'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)',
            [username, email, hashedPassword],
            function(insertErr) {
              if (insertErr) {
                console.error('Error creating admin:', insertErr);
                db.close();
                process.exit(1);
              }
              console.log('✓ Admin user created successfully!');
              console.log(`Username: ${username}`);
              console.log(`Email: ${email}`);
              console.log(`Password: ${password}`);
              db.close();
            }
          );
        }
      }
    );
  });
}

