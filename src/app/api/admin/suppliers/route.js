// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs for scrambling passwords (used when manually creating a supplier)
import bcrypt from 'bcryptjs';
// Import our custom auth tool to verify admin access
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/admin/suppliers/route.js
 * Description: Admin Supplier List & Creation API.
 * - GET: Used by the Admin to view a list of all suppliers who have verified their emails.
 * - POST: Used by the Admin to manually bypass the standard signup process and create a new supplier account.
 */

// Prevent Next.js from caching this page so the list is always fresh
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Handles GET requests to show the list of suppliers
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Ensure the person asking is an Admin
        // PRIVILEGE: Global Supplier Directory Access
        // Only Admins have the global privilege to fetch the entire supplier directory 
        // or bypass standard registration.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 }); // 403 Forbidden
        }

        try {
            // Step 2: Fetch all suppliers from the database
            // We use "LEFT JOIN" to combine data from the 'suppliers' table and the 'users' table.
            // We specifically EXCLUDE people whose status is 'unverified_email' because they haven't finished signing up yet.
            // We use 'first_name' from the users table as the company name.
            const [suppliers] = await db.query(`
            SELECT s.*, u.status as user_status, u.first_name as company_name
            FROM suppliers s 
            LEFT JOIN users u ON s.user_id = u.user_id
            WHERE u.status != 'unverified_email'
            ORDER BY s.created_at DESC
        `);
            // Step 3: Send the full list back to the admin dashboard
            return NextResponse.json(suppliers);
            
        } catch (error) {
            // Log database-specific errors
            console.error(error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
    } catch (error) {
        // Log general server errors
        console.error("Supplier GET error:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Handles POST requests when the Admin manually creates a new supplier
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Ensure the person making the request is an Admin
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        
        // Step 2: Read the form data the Admin typed in
        const body = await request.json();
        const { registrationNumber, email, password, phone, address } = body;

        // Step 3: Scramble the password securely before saving
        const hash = await bcrypt.hash(password, 10);

        // Step 4: Manually insert the new user into the 'users' table
        // Notice we instantly set their status to 'active' because an Admin created them (no email verification needed)
        const [uResult] = await db.query(
            `INSERT INTO users (first_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, 'supplier', 'active', NOW())`,
            [registrationNumber, email, hash]
        );

        // Step 5: Manually insert the supplier's business details into the 'suppliers' table
        // We link it to the user account we just created using 'uResult.insertId'
        const [sResult] = await db.query(
            "INSERT INTO suppliers (user_id, business_registration_number, phone, address, created_at) VALUES (?, ?, ?, ?, NOW())",
            [uResult.insertId, registrationNumber, phone, address]
        );

        // Step 6: Tell the admin it was successful
        return NextResponse.json({
            supplier_id: sResult.insertId,
            registrationNumber, email,
            created_at: new Date()
        });
        
    } catch (error) {
        // Log any crashes during creation
        console.error(error);
        return NextResponse.json({ error: "Creation failed" }, { status: 500 });
    }
}
