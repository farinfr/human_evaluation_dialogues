const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    const username = await question('Enter admin username: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    if (!username || !email || !password) {
      console.log('All fields are required!');
      rl.close();
      process.exit(1);
    }

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
                  rl.close();
                  process.exit(1);
                }
                console.log('Admin user updated successfully!');
                rl.close();
                db.close();
              }
            );
          } else {
            console.error('Error creating admin:', err);
            rl.close();
            process.exit(1);
          }
        } else {
          console.log('Admin user created successfully!');
          rl.close();
          db.close();
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();

