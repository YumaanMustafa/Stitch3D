# Developer Manual: Database Setup Guide

This guide describes how to configure, initialize, and seed the MySQL database for the Stitch3D commerce and customizer platform.

---

## 1. System Requirements & Prerequisites
Before starting, ensure the following are installed and running:
*   **MySQL Server** (v8.0 or higher) or an environment suite like **XAMPP / WampServer** containing MySQL.
*   **Node.js** (v18.0 or higher) and **npm**.

---

## 2. Step-by-Step Setup Workflow

### Step 1: Configure Environment Variables
Create a file named `.env` in the root of the project workspace (`stitch3d-main/`) and input your local MySQL server connection parameters:

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password_here
DB_NAME=stitch3d

# Security
JWT_SECRET=supersecretkey
```

> [!NOTE]
> If your MySQL `root` user does not have a password (the default for XAMPP), leave `DB_PASS=` blank.

---

### Step 2: Initialize Database and Tables
We have configured a unified script in the project metadata to automate database creation, schema modeling, and seeding:

Open your terminal in the project root directory and run:
```bash
npm run db:setup
```

#### What this script does behind the scenes:
1.  **Creates Schema Database:** Invokes [src/scripts/createDatabase.js](file:///c:/Users/Public/Videos/stitch3d-main/src/scripts/createDatabase.js) which connects to your MySQL server and runs `CREATE DATABASE IF NOT EXISTS stitch3d;`.
2.  **Generates Models & Tables:** Invokes [src/lib/initDb.js](file:///c:/Users/Public/Videos/stitch3d-main/src/lib/initDb.js) which creates all the target tables (`users`, `customers`, `vendors`, `suppliers`, `orders`, `order_items`, `messages`, `customized_designs`, `complaints`, `product_reviews`).
3.  **Seeds Test Accounts:** Automatically populates the database with default test accounts, jackets catalog, and inventory items.

---

### Step 3: Verify the Connection
To ensure the application can read and write to the database pool, run the verification script:
```bash
node scratch_db.js
```
Upon a successful connection, you should see the confirmation message followed by seeded statistics:
```text
✅ MySQL connected.
Running queries...
vendorsRes: [ { count: 3 } ]
usersRes: [ { count: 2 } ]
suppliersRes: [ { count: 2 } ]
```

---

## 3. Seeded Accounts Reference (For Testing)
Use these pre-configured credentials to login and test different portals of the website:

| Account Type | Email Address | Password | Fulfilling Role |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@stitch.local` | `admin123` | Moderate platform accounts, view chart analytics, approve deletions. |
| **Vendor** | `vendor@stitch.local` | `vendor123` | Manage orders, view customizer designs, request raw inventory. |
| **Customer** | `alice.cust@test.com` | `password` | Design jackets on the 2D customizer canvas, checkout items, chat. |
| **Supplier** | `eve.supp@test.com` | `password` | Restock inventories, bid on materials. |

---

## 4. Troubleshooting Common Errors

### ❌ Error: `ECONNREFUSED`
*   **Cause:** The MySQL server engine is not running.
*   **Solution:** Open XAMPP Control Panel and start the MySQL module, or run `services.msc` and verify that the "MySQL" service status is "Running".

### ❌ Error: `ER_ACCESS_DENIED_ERROR`
*   **Cause:** Incorrect username or password in the `.env` configuration.
*   **Solution:** Check if `DB_USER` and `DB_PASS` values match your local database authentication rules.

### ❌ Error: `ER_BAD_DB_ERROR`
*   **Cause:** The database schema `stitch3d` does not exist and database creation scripts were skipped.
*   **Solution:** Execute `node src/scripts/createDatabase.js` manually to create the schema space prior to seeding tables.
