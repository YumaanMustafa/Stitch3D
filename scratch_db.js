import db from './src/lib/db.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT user_id, email, role, status FROM users');
    console.log("Users:", rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
