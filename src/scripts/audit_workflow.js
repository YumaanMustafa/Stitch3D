import db from "../lib/db.js";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";

async function runAudit() {
  console.log("🔍 Starting System Workflow Audit...");
  const report = [];
  report.push("# Stitch3D System Workflow Audit Report");
  report.push(`Generated on: ${new Date().toISOString()}`);
  report.push("");
  report.push("This report summarizes the workflow verification audit of the Stitch3D system.");
  report.push("");

  let dbSuccess = false;
  let tablesCount = 0;
  
  // 1. Database Connection and Schema verification
  try {
    const [tables] = await db.query("SHOW TABLES");
    tablesCount = tables.length;
    dbSuccess = true;
    report.push("## 1. Database Connectivity & Schema");
    report.push("- **Status**: ✅ Connection Successful");
    report.push(`- **Database Name**: \`stitch3d\``);
    report.push(`- **Tables Found**: ${tablesCount} tables`);
    report.push("  - " + tables.map(t => Object.values(t)[0]).join(", "));
    report.push("");
  } catch (err) {
    report.push("## 1. Database Connectivity & Schema");
    report.push("- **Status**: ❌ Connection Failed");
    report.push(`- **Error**: ${err.message}`);
    report.push("");
  }

  if (!dbSuccess) {
    console.error("❌ DB verification failed. Aborting audit.");
    writeReportAndExit(report);
    return;
  }

  // Helper to call APIs
  const apiCheck = async (name, url, options = {}) => {
    try {
      const res = await fetch(url, options);
      const status = res.status;
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = await res.text();
      }
      return { success: res.ok, status, data };
    } catch (err) {
      return { success: false, status: 0, error: err.message };
    }
  };

  // 2. Public API verification
  report.push("## 2. Public Endpoints Verification");
  console.log("Checking public products endpoint...");
  const prodCheck = await apiCheck("Get Products", `${BASE_URL}/api/public/products`);
  if (prodCheck.success && Array.isArray(prodCheck.data)) {
    report.push("- **Public Products Route**: ✅ Works");
    report.push(`  - Returned ${prodCheck.data.length} products (e.g., "${prodCheck.data[0]?.name || 'N/A'}")`);
  } else {
    report.push("- **Public Products Route**: ❌ Failed");
    report.push(`  - Status: ${prodCheck.status}`);
    report.push(`  - Response: ${JSON.stringify(prodCheck.data || prodCheck.error)}`);
  }
  report.push("");

  // 3. Admin Authentication and Profile workflow
  report.push("## 3. Admin User Workflow");
  console.log("Checking admin login...");
  const adminLogin = await apiCheck("Admin Login", `${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@stitch.local", password: "admin123" })
  });

  let adminToken = null;
  if (adminLogin.success && adminLogin.data?.token) {
    adminToken = adminLogin.data.token;
    report.push("- **Admin Login**: ✅ Works");
    report.push("  - Token retrieved successfully");
    
    // Check Admin Profile
    console.log("Checking admin profile...");
    const adminProfile = await apiCheck("Admin Profile", `${BASE_URL}/api/admin/profile`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (adminProfile.success) {
      report.push("- **Admin Profile Route**: ✅ Works");
      report.push(`  - Welcome message: "${adminProfile.data?.admin?.name || 'N/A'}"`);
    } else {
      report.push("- **Admin Profile Route**: ❌ Failed");
      report.push(`  - Status: ${adminProfile.status}`);
      report.push(`  - Error: ${JSON.stringify(adminProfile.data || adminProfile.error)}`);
    }
  } else {
    report.push("- **Admin Login**: ❌ Failed");
    report.push(`  - Status: ${adminLogin.status}`);
    report.push(`  - Response: ${JSON.stringify(adminLogin.data || adminLogin.error)}`);
  }
  report.push("");

  // 4. Vendor Authentication and Profile workflow
  report.push("## 4. Vendor User Workflow");
  console.log("Checking vendor login...");
  const vendorLogin = await apiCheck("Vendor Login", `${BASE_URL}/api/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "vendor@stitch.local", password: "vendor123" })
  });

  let vendorToken = null;
  if (vendorLogin.success && vendorLogin.data?.token) {
    vendorToken = vendorLogin.data.token;
    report.push("- **Vendor Login**: ✅ Works");
    report.push("  - Token retrieved successfully");
    
    // Check Vendor Profile
    console.log("Checking vendor profile...");
    const vendorProfile = await apiCheck("Vendor Profile", `${BASE_URL}/api/auth/profile`, {
      headers: { "Authorization": `Bearer ${vendorToken}` }
    });
    if (vendorProfile.success) {
      report.push("- **Vendor Profile Route**: ✅ Works");
      report.push(`  - Role returned: "${vendorProfile.data?.user?.role || 'N/A'}"`);
    } else {
      report.push("- **Vendor Profile Route**: ❌ Failed");
      report.push(`  - Status: ${vendorProfile.status}`);
      report.push(`  - Error: ${JSON.stringify(vendorProfile.data || vendorProfile.error)}`);
    }
  } else {
    report.push("- **Vendor Login**: ❌ Failed");
    report.push(`  - Status: ${vendorLogin.status}`);
    report.push(`  - Response: ${JSON.stringify(vendorLogin.data || vendorLogin.error)}`);
  }
  report.push("");

  // 5. Customer Authentication, Profile & Registration workflow
  report.push("## 5. Customer User Workflow");
  console.log("Creating temporary customer user...");
  const tempEmail = `temp_audit_${Date.now()}@stitch.local`;
  const tempPass = "tempPass123";
  
  try {
    const hashed = await bcrypt.hash(tempPass, 10);
    const [uResult] = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'customer', 'active')`,
      ["Temp", "Audit", tempEmail, hashed]
    );
    const userId = uResult.insertId;
    await db.query("INSERT INTO customers (user_id) VALUES (?)", [userId]);
    console.log(`Temporary customer created: ${tempEmail}`);

    console.log("Checking customer login...");
    const customerLogin = await apiCheck("Customer Login", `${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tempEmail, password: tempPass })
    });

    let customerToken = null;
    if (customerLogin.success && customerLogin.data?.token) {
      customerToken = customerLogin.data.token;
      report.push("- **Customer Login**: ✅ Works");
      
      console.log("Checking customer profile...");
      const customerProfile = await apiCheck("Customer Profile", `${BASE_URL}/api/auth/profile`, {
        headers: { "Authorization": `Bearer ${customerToken}` }
      });
      if (customerProfile.success) {
        report.push("- **Customer Profile Route**: ✅ Works");
        report.push(`  - Email matches: "${customerProfile.data?.user?.email || 'N/A'}"`);
      } else {
        report.push("- **Customer Profile Route**: ❌ Failed");
        report.push(`  - Status: ${customerProfile.status}`);
      }
    } else {
      report.push("- **Customer Login**: ❌ Failed");
      report.push(`  - Status: ${customerLogin.status}`);
    }

    // Cleanup
    await db.query("DELETE FROM users WHERE user_id = ?", [userId]);
    console.log("Cleaned up temporary customer user.");
    report.push("- **Temporary User Cleanup**: ✅ Successful");
  } catch (err) {
    report.push("- **Customer Workflow Test**: ❌ Failed with exception");
    report.push(`  - Error: ${err.message}`);
  }
  report.push("");

  writeReportAndExit(report);
}

import fs from "fs";
import path from "path";

function writeReportAndExit(reportLines) {
  const finalReport = reportLines.join("\n");
  console.log("\n--- AUDIT REPORT SUMMARY ---");
  console.log(finalReport);
  console.log("----------------------------\n");

  fs.writeFileSync("audit_report.md", finalReport, "utf8");
  console.log("✅ Wrote audit report to audit_report.md");
  
  process.exit(0);
}

runAudit();
