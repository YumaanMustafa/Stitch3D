// Load environment variables from .env file so we can access DB credentials securely
import "dotenv/config";
// Import mysql2 library which lets Node.js talk to MySQL databases
import mysql from "mysql2/promise";

/**
 * File: db.js
 * Description: Database connection configuration using MySQL2 connection pool.
 * A connection pool keeps multiple database connections open so the app does not
 * have to create a new connection every time it talks to the database.
 */

// Create a connection pool using settings from environment variables
// If environment variables are not set, fallback values are used instead
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",      // The server address where MySQL is running
  port: process.env.DB_PORT || 3306,             // The port MySQL listens on (default is 3306)
  user: process.env.DB_USER || "root",           // MySQL login username
  password: process.env.DB_PASS || "",           // MySQL login password (empty string means no password)
  database: process.env.DB_NAME || "stitch3d",   // The name of the database to connect to
  // Only use SSL encryption if connecting to a remote host (not localhost)
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
  connectionLimit: 10,       // Maximum number of connections kept open at the same time
  queueLimit: 0,             // No limit on how many queries can wait in line
  waitForConnections: true,  // If all connections are busy, new queries will wait instead of failing
  enableKeepAlive: true,     // Send periodic pings to keep idle connections alive
  keepAliveInitialDelay: 0   // Start keepalive pings immediately with no delay
});

// Print a confirmation message to the terminal when the pool is created
console.log("MySQL connected.");

// Export the db pool so other files can import and use it to run queries
export default db;
