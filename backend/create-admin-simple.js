const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'admin123';

  console.log(`Creating admin user: ${username} (${email})`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT OR REPLACE INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            // Update existing user to admin
            db.run(
              'UPDATE users SET password = ?, is_admin = 1 WHERE username = ? OR email = ?',
              [hashedPassword, username, email],
              function(updateErr) {
                if (updateErr) {
                  console.error('Error updating user:', updateErr);
                  db.close();
                  process.exit(1);
                }
                console.log('✓ Admin user updated successfully!');
                console.log(`Username: ${username}`);
                console.log(`Email: ${email}`);
                console.log(`Password: ${password}`);
                db.close();
              }
            );
          } else {
            console.error('Error creating admin:', err);
            db.close();
            process.exit(1);
          }
        } else {
          console.log('✓ Admin user created successfully!');
          console.log(`Username: ${username}`);
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          db.close();
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
    process.exit(1);
  }
}

createAdmin();

