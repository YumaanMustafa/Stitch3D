// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import bcryptjs for scrambling passwords
import bcrypt from 'bcryptjs';
// Import our custom auth tool to check admin status
import { getUserFromRequest } from '@/lib/auth';

/**
 * File: route.js
 * Location: src/app/api/admin/vendors/route.js
 * Description: Admin Vendor List & Creation API.
 * - GET: Shows the Admin a list of all Vendors who have verified their emails.
 * - POST: Allows the Admin to manually create a new Vendor without them having to sign up.
 */

// Prevent Next.js from caching this page so the list is always fresh
export const dynamic = 'force-dynamic';

// ==========================================
// GET HANDLER: Handles GET requests when the Admin opens the 'Vendors' page
// ==========================================
export async function GET(request) {
    try {
        // Step 1: Security Check. Ensure the person asking is an Admin.
        // PRIVILEGE: Global Vendor Directory Access
        // Only Admins have the global privilege to fetch the entire vendor directory 
        // or manually bypass standard registration.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        try {
            // Step 2: Fetch all vendors from the database
            // We use "LEFT JOIN" to combine the vendor's shop data with their user account status.
            // We EXCLUDE people whose status is 'unverified_email' because they aren't fully registered.
            const [vendors] = await db.query(`
            SELECT v.*, u.status as user_status 
            FROM vendors v 
            LEFT JOIN users u ON v.user_id = u.user_id
            WHERE u.status != 'unverified_email'
            ORDER BY v.created_at DESC
        `);
            // Log it in the terminal for debugging purposes
            console.log("Admin Vendor GET Fetch:", vendors.map(v => ({ id: v.vendor_id, uid: v.user_id, status: v.user_status })));
            
            // Step 3: Send the list to the dashboard
            return NextResponse.json(vendors);
            
        } catch (error) {
            // Log database crashes
            console.error(error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
    } catch (error) {
        // Log general server crashes
        console.error("Vendor GET error:", error);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }
}

// ==========================================
// POST HANDLER: Handles POST requests when the Admin manually adds a new Vendor
// ==========================================
export async function POST(request) {
    try {
        // Step 1: Security Check. Make sure it's an Admin.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        
        // Step 2: Read the details the Admin typed into the "Add Vendor" form
        const body = await request.json();
        const { name, email, password, company_name } = body;

        // Step 3: Scramble (hash) the new password securely
        const hash = await bcrypt.hash(password, 10);

        // Step 4: Manually create the User account
        // We set their status to 'active' immediately since the Admin is making it
        const [uResult] = await db.query(
            `INSERT INTO users (first_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, 'vendor', 'active', NOW())`,
            [name, email, hash]
        );

        // Step 5: Manually create the Vendor profile linked to that new user
        // We use 'uResult.insertId' to link the tables together
        const [vResult] = await db.query(
            "INSERT INTO vendors (name, email, password, company_name, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
            [name, email, hash, company_name, uResult.insertId]
        );

        // Step 6: Reply back with the new Vendor's details
        return NextResponse.json({
            vendor_id: vResult.insertId,
            name, email, company_name,
            created_at: new Date()
        });
        
    } catch (error) {
        // Log creation crashes
        console.error(error);
        return NextResponse.json({ error: "Creation failed" }, { status: 500 });
    }
}
