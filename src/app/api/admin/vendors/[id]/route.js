// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import our custom auth tool to verify admin access
import { getUserFromRequest } from '@/lib/auth';
// Import our custom email tool to send approval/rejection emails
import { sendAccountStatusEmail } from '@/lib/email';

/**
 * File: route.js
 * Location: src/app/api/admin/vendors/[id]/route.js
 * Description: Admin Vendor Management API (For a single Vendor).
 * This route allows an Admin to do two dangerous actions:
 * 1. PUT: Change a vendor's details or approve/reject their account.
 * 2. DELETE: Completely wipe a vendor's account from the system.
 */

// ==========================================
// PUT HANDLER: Handles PUT requests to update or approve/reject a vendor
// ==========================================
export async function PUT(request, { params }) {
    try {
        // Step 1: Security Check. Ensure the request is from an admin.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Grab the ID of the vendor we are editing from the URL
        const { id } = await params;
        
        // Read the new data sent by the Admin
        const body = await request.json();
        console.log(`[Vendor PUT] ID: ${id}, Body:`, body);
        const { name, email, company_name, status } = body;

        // Step 2: Update the 'vendors' table with new shop details (if provided)
        if (name || email || company_name) {
            console.log("Updating vendor details...");
            await db.execute(
                "UPDATE vendors SET name = ?, email = ?, company_name = ? WHERE vendor_id = ?",
                [name || null, email || null, company_name || null, id]
            );
        }

        // Step 3: Update the Vendor's account status (Approve/Reject)
        // Vendors are backed by a master record in the 'users' table, so we update the status there.
        if (status) {
            console.log("Updating vendor status...");
            
            // First, find their linked user_id and email so we know who to update and email
            const [rows] = await db.query(
                "SELECT v.user_id, u.email, u.status as old_status FROM vendors v JOIN users u ON v.user_id = u.user_id WHERE v.vendor_id = ?",
                [id]
            );
            console.log("Found vendor rows:", rows);

            // If we found them...
            if (rows.length > 0 && rows[0].user_id) {
                const userId = rows[0].user_id;
                const emailAddress = rows[0].email;
                const oldStatus = rows[0].old_status;

                // Update their status in the users table
                console.log(`Updating user ${userId} status to ${status}`);
                const [updateResult] = await db.execute("UPDATE users SET status = ? WHERE user_id = ?", [status, userId]);
                console.log("Update result:", updateResult);

                // Send them an email if the Admin just approved ('active') or 'rejected' them.
                // We only send it if the status actually changed.
                if ((status === 'active' || status === 'rejected') && status !== oldStatus && emailAddress) {
                    await sendAccountStatusEmail(emailAddress, status);
                }
            } else {
                console.warn(`Vendor ${id} has no linked user_id, cannot update status.`);
            }
        }

        // Tell the admin dashboard it was successful
        return NextResponse.json({ message: "Updated", status });
        
    } catch (error) {
        // Log crashes securely
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Handles DELETE requests to completely remove a vendor
// ==========================================
export async function DELETE(request, { params }) {
    try {
        // Step 1: Security Check. Enforce admin-only access.
        const admin = getUserFromRequest(request);
        if (admin.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Grab the ID of the vendor to delete
        const { id } = await params;

        // Step 2: Look up the vendor BEFORE deleting them so we can find their linked 'user_id'
        const [rows] = await db.query("SELECT user_id FROM vendors WHERE vendor_id = ?", [id]);

        // Step 3: Delete the Vendor's shop record from the 'vendors' table
        await db.execute("DELETE FROM vendors WHERE vendor_id = ?", [id]);

        // Step 4: Cascading Delete
        // We must also delete their linked User account and any customer records they might have.
        if (rows.length > 0 && rows[0].user_id) {
            const userId = rows[0].user_id;
            console.log(`Cascading delete: Removing user ${userId} linked to vendor ${id}`);

            // Check if this specific user also has a customer profile
            const [customerRows] = await db.query("SELECT customer_id FROM customers WHERE user_id = ?", [userId]);
            if (customerRows.length > 0) {
                const customerId = customerRows[0].customer_id;

                // Delete all Order Items linked to their Orders
                await db.query(`
                    DELETE order_items FROM order_items 
                    JOIN orders ON order_items.order_id = orders.order_id 
                    WHERE orders.customer_id = ?
                `, [customerId]);

                // Delete the empty Orders themselves
                await db.execute("DELETE FROM orders WHERE customer_id = ?", [customerId]);

                // Delete their Customer Profile
                await db.execute("DELETE FROM customers WHERE customer_id = ?", [customerId]);
            }

            // Finally, delete the core user record from the main 'users' table
            await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
        }

        // Return a success message
        return NextResponse.json({ message: "Vendor and associated user deleted successfully" });
        
    } catch (error) {
        // Log any crashes securely
        console.error("Delete Vendor Error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
