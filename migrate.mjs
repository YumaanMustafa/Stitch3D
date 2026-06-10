import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stitch3d',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log("Adding status column to customized_designs...");
    await pool.query("ALTER TABLE customized_designs ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';");
    console.log("Success.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Migration error:", err);
    }
  } finally {
    pool.end();
  }
}

migrate();
