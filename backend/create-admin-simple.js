const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Get credentials from command line arguments or use defaults
const args = process.argv.slice(2);
const username = args[0] || 'admin';
const email = args[1] || 'admin@example.com';
const password = args[2] || 'admin123';

if (!username || !email || !password) {
  console.error('Usage: node create-admin-simple.js [username] [email] [password]');
  console.error('Or use defaults: username=admin, email=admin@example.com, password=admin123');
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    
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
                console.log(`You can now login with:`);
                console.log(`  Username: ${username}`);
                console.log(`  Email: ${email}`);
                console.log(`  Password: ${password}`);
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
          console.log(`You can now login with:`);
          console.log(`  Username: ${username}`);
          console.log(`  Email: ${email}`);
          console.log(`  Password: ${password}`);
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
