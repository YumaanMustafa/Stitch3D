import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "stitch3d";

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
  });

  console.log(`Creating database \`${dbName}\` if it does not exist...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  console.log(`✅ Database \`${dbName}\` ensured.`);
  await connection.end();
}

main().catch(err => {
  console.error("❌ Error creating database:", err);
  process.exit(1);
});
